const defaultOptions = {
    version: '0.90',
    storageName: 'FidlStore090',
    screenWidth: 'normal',
    bytesExport: 'HEX',
    bytesPerLine: 10,
    validate4KBlockSize: true,
    validateEndJump: true,
    validateFirstLMS: true,
    lastTemplate: 0
}
let options = {};
const dontSave = ['version', 'storageName'];
const scanlinesMax = 240;
const maxRamSize = 4096;
const defaultDisplay = {
    list: [],
    scanlines: 0,
    videoram: 0,
    bytecode: []
}
let display = {}

// ******************************* HELPERS

function decimalToHex(d, padding) {
    var hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
    while (hex.length < padding) {
        hex = "0" + hex;
    }
    return hex;
}

const userIntParse = (udata) => {
    if (_.isNull(udata)) return null;
    udata = _.trim(udata);
    let sign = 1;
    if (_.startsWith(udata, '-')) {
        sign = -1;
        udata = udata.slice(1);
    }
    if (_.startsWith(udata, '$')) {
        udata = parseInt(_.trim(udata, '$'), 16);
    } else {
        udata = parseInt(udata, 10);
    }
    if (!_.isNaN(udata)) {
        if (sign === -1) {
            udata = binFile.data.length - udata;
        }
        return udata;
    } else {
        return NaN;
    }
}

// *********************************** DLIST

const redrawList = () => {
    $("#dlist, #antic_view").empty();
    _.each(display.list,line => guiAddDLLine(line));
} 

const updateModeParams = line => {
    line.antic = DLmodes[line.mode].antic;
    line.hex = decimalToHex(line.antic);
    line.scanlines = DLmodes[line.mode].scanlines * line.count || 0;
    let bpl = DLmodes[line.mode].bpl;
    let b20 = bpl / 5;
    if ((options.screenWidth == 'narrow') && (!line.hscroll)) bpl = bpl - b20;
    if ((options.screenWidth == 'normal') && (line.hscroll)) bpl = bpl + b20;
    if (options.screenWidth == 'wide') bpl = bpl + b20;
    line.ram = bpl * line.count || 0;
    return line;
}

const recalcWidths = () => {
    _.each(display.list, updateModeParams)
}

const getFreeId = () => {
    let max = 0;
    display.list.forEach(line => {
        if (line.id >= max) max = line.id+1;
    });
    return max;
}

const newScreenLine  = (mode, id) => {
    return updateModeParams({
        id: id || getFreeId(),
        mode: mode,
        count: 1,
        hscroll: false,
        vscroll: false,
        LMS: false,
        DLI: false,
        address: ''
    });
}

const readRow = id => {
    const rowId = `#rowId_${id}`;
    const rowDiv = $(rowId);
    let row = false;
    if (rowDiv) {
        const rowMode = $(`${rowId}_mode`).children("option:selected").val()
        row = updateModeParams({
            mode: rowMode,
            count: $(`${rowId}_count`).val(),
            LMS: $(`${rowId}_LMS`).is(":checked"),
            DLI: $(`${rowId}_DLI`).is(":checked"),
            hscroll: $(`${rowId}_hscroll`).is(":checked"),
            vscroll: $(`${rowId}_vscroll`).is(":checked"),
            address: $(`${rowId}_address`).val(),
        });
    }
    return row;
}

const getLineById = id => _.find(display.list, ['id', id]);

const getLineIndexById = id => _.findIndex(display.list, ['id', id]);

const updateLineFromRow = id => {
    let line = getLineById(id);
    const row = readRow(id);
    if (line && row) {
        line = _.assign(line, row);
    }
}

const rowChanged = (e) => {
    const rowId = $(e.target).parent().attr('id').split('_')[1];
    //if (rowId == 'jmp') {
    //    display.jump = _.assign(display.jump, readRow(rowId))
    //} else {
        updateLineFromRow(Number(rowId));
    //}
    updateListStatus();
}

const modeSelector = (line, rfilter) => {
    const select = $('<select/>').attr('id',`rowId_${line.id}_mode`).bind('change', rowChanged);
    _.forEach(DLmodes, (mode, name) => {
        if (rfilter(updateModeParams({mode: name}))) {
          const option = $('<option/>').attr('value', name).html(name);
          if (line.mode == name) option.attr('selected','selected');
          select.append(option);
        }
    });
    return select;
}

const rowInput = (line, name, dflt) => $('<input/>')
        .attr('type','text')
        .attr('id',`rowId_${line.id}_${name}`)
        .val(dflt||'')
        .bind('change', rowChanged);

const rowCheckbox = (line, name, state = false) =>  $('<input/>')
        .attr('type','checkbox')
        .prop('checked', state)
        .attr('id',`rowId_${line.id}_${name}`)
        .bind('change', rowChanged);

const rowIcon = (line, className, handler) => $('<i/>')
        .addClass('fas')
        .addClass(className)
        .bind('click', handler);

const isFirst = rowId => display.list[0].id == rowId;
const isLast = rowId => display.list[display.list.length-1].id == rowId;

const getEventRowId = e => Number($(e.target).parent().attr('id').split('_')[1]);

const moveRowUp = e => {
    const rowId = getEventRowId(e);
    if (!isFirst(rowId)) {
        const rowIndex = getLineIndexById(rowId);
        const prevId = display.list[rowIndex - 1].id;
        const tempLine = display.list[rowIndex];
        display.list[rowIndex] = display.list[rowIndex - 1];
        display.list[rowIndex - 1] = tempLine;
        redrawList();
        updateListStatus();
    }
}

const moveRowDown = e => {
    const rowId = getEventRowId(e);
    if (!isLast(rowId)) {
        const rowIndex = getLineIndexById(rowId);
        const nextId = display.list[rowIndex + 1].id;
        const tempLine = display.list[rowIndex];
        display.list[rowIndex] = display.list[rowIndex + 1];
        display.list[rowIndex + 1] = tempLine;
        redrawList();
        updateListStatus();
    }
}
const removeRow = e => {
    const rowId = getEventRowId(e);
    display.list = _.filter(display.list, row => row.id != rowId);
    $('#rowId_'+rowId).remove();
    updateListStatus();
}

const getFilterFromLine = line => {
    filters = [isScreenLine, isBlank, isJump];
    for (f of filters) {
        if (f(line)) return f
    }
}

const guiAddDLLine = (line, list = '#dlist') => {
    const lineItem = $('<li/>')
        .addClass('listRow')
        .attr('id', `rowId_${line.id}`)
        .append(modeSelector(line, getFilterFromLine(line)))
        .append(rowInput(line, 'count', line.count)
            .attr("disabled", isJump(line)))
        .append(rowCheckbox(line,'DLI',line.DLI)
            .attr('title','Display List Interrupt'))
        .append(rowCheckbox(line,'hscroll',line.hscroll)
            .attr('title','Horizontal Scrolling')
            .attr("disabled", isBlank(line) || isJump(line)))
        .append(rowCheckbox(line,'vscroll',line.vscroll)
            .attr('title','Vertical Scrolling')
            .attr("disabled", isBlank(line) || isJump(line)))
        .append(rowCheckbox(line,'LMS',line.LMS)
            .attr('title','Load Memory Scan')
            .attr("disabled", isBlank(line) || isJump(line)))
        .append(rowInput(line,'address', line.address).attr("disabled", isBlank(line)))
        //if (!isJump(line)) {
        //  lineItem
          .append(rowIcon(line,'arrowDown fa-arrow-alt-circle-down',moveRowDown).attr('title','Move Down'))
          .append(rowIcon(line,'arrowUp fa-arrow-alt-circle-up',moveRowUp).attr('title','Move Up'))
          .append(rowIcon(line,'fa-ban',removeRow).attr('title','Delete Row'));
        //}
    $(list).append(lineItem);
    const anticLine = () => $('<div/>')
        .addClass('antic_line')
        .addClass(`line_${_.replace(line.mode,/ /g,'_')}`);
    $('#antic_view').append(_.times(line.count, anticLine));        
}

const addScreenLine = () => {
  display.list.push(newScreenLine('TXT 40x24 2c'));
  guiAddDLLine(_.last(display.list));
  updateListStatus();
};

const addBlankLine = () => {
  display.list.push(newScreenLine('8 BLANKS'));
  guiAddDLLine(_.last(display.list));
  updateListStatus();
};

const addJumpLine = () => {
    display.list.push(newScreenLine('JVB'));
    guiAddDLLine(_.last(display.list));
    updateListStatus();
  };

const cloneLastLine = () => {
    if (display.list.length>0) {
        const rowClone = _.clone(_.last(display.list));
        rowClone.id = getFreeId();
        display.list.push(rowClone);
        guiAddDLLine(_.last(display.list));
        updateListStatus();
    }
}

const clearDL = () => {
    if (confirm('Are You sure??')) {
        display = _.assignIn({}, _.cloneDeep(defaultDisplay));
        redrawList();
    }
    updateListStatus();
};

const isJump = row => row.hex == '41' || row.hex == '01';

const isBlank = row => row.hex[1] == '0' ;

const hasAddress = row => row.address != '';

const isScreenLine = row => !isJump(row) && !isBlank(row);

const needsAddress = row => {
  if (isJump(row)) return true;
  if (isBlank(row)) return false;
  return (row.LMS) != 0 ;
};

const updateSizes = () => {
    $('#sizes').empty()
        .append(`<p>scanlines: ${display.scanlines}</p>`)
        .append(`<p>video RAM size: ${display.videoram}</p>`)
        .append(`<p>DL size: ${display.bytecode.length}</p>`)
}   

const updateAnticWidth = () => {
    let pxWidth = screenWidths[options.screenWidth]*8;
    if (options.screenWidth == 'wide') pxWidth -= 32; // antic wide fix
    $('#antic_view').css('width', pxWidth);
}

const updateListStatus = () => {
    const {error, warnings} = parseAndValidate();
    $('#state').html(error?'Display List ERROR!':'Display List OK');
    $('#warnings').html(warnings);
    updateSizes();
    storeDisplay();
    updateAnticWidth();
    redrawList();
}

const isDecOrHexInteger = v => {
    if (_.isInteger(v)) {
        return true;
    } 
    if (typeof v === 'string' || v instanceof String) {
        if (v[0] == '$') {
            const int = parseInt(v.substring(1), 16);
            if (!_.isNaN(int)) return true;
        } else {
            const int = parseInt(v);
            if (!_.isNaN(int)) return true;
        }
    }
    return false
}

const parseAddress = row => {
    if (_.isInteger(row.address)) {
      addr = row.address & 0xFFFF;
      return { lo: addr & 0xFF, hi: (addr & 0xFF00) >> 8 }
    } 
    if ((typeof row.address === 'string' || row.address instanceof String) && row.address[0] == '$')
    {
      addr = parseInt(row.address.substring(1), 16) & 0xFFFF;
      if (!isNaN(addr))
        return { lo: addr & 0xFF, hi: (addr & 0xFF00) >> 8 }
    }
    throw (`Error! Unable to parse address: '${row.address}'. Use decimal value, or hex prefixed with '$'.`);
}

const getLineBytecode = line => {
    bytecode = [];
    let cmdByte = line.antic;
    if (line.DLI) cmdByte |= 0b10000000;
    if (line.LMS) cmdByte |= 0b01000000;
    if (line.vscroll) cmdByte |= 0b00100000;
    if (line.vscroll) cmdByte |= 0b00010000;
    bytecode.push(cmdByte);
    if (needsAddress(line)) {
        bytecode.push('#');
        bytecode.push(line.address);
    }
    return bytecode;
}

const parseAndValidate = (template) => {

    let warnings = '';
    let DLerror = false;
    const addMsg = txt => warnings += txt + "<br>";
    const addError = (txt, rowId) => { 
        warnings += txt + "<br>"; 
        DLerror = true;
        if (!_.isUndefined(rowId)) $(`#rowId_${rowId}`).addClass('rowError');
    };
    const isAddressParsable = (row) => {
        if (!isDecOrHexInteger(row.address)) {
            addError(`Error! this template needs all address fields to be numeric values. (address = ${row.address})`, row.id);
        } else {
            const address = userIntParse(row.address);
            if ((address<0) || (address>65536)) 
            addError(`Error! Address out of range!!! (address = ${row.address})`, row.id);
        }
    }

    display.videoram = 0;
    videoram = 0;
    display.scanlines = 0;
    display.bytecode = [];
    let line = 0;
    let firstLine = true;
    let hasJump = false;
    $('li').removeClass('rowError');
    
    for (line of display.list) {

        if (!isDecOrHexInteger(line.count)) 
            addError(`Error! Count value '${line.count}' is not an integer.`, line.id);

        display.scanlines += line.scanlines;
        if (display.scanlines > scanlinesMax) 
            if (options.validateScanlinesLimit)
            addError(`Error! You have exceeded the maximum number of scanlines! (max. ${scanlinesMax} lines).`, line.id);

        display.videoram += line.ram;        
        if (needsAddress(line)) videoram = 0;
        videoram += line.ram;
        if (videoram > maxRamSize) 
            if (options.validate4KBlockSize)
                addError(`Error! You have exceeded the maximum size of continuous memory block! (max. ${maxRamSize} bytes).`, line.id);

        if (isScreenLine(line) && firstLine) {
            if (options.validateFirstLMS)
                if (!needsAddress(line)) addError(`Error! First screen line has to point to a memory address (LMS) - ${line.mode}.`, line.id);
            firstLine = false;
        }
              
        if (needsAddress(line) && !hasAddress(line) )
            addError(`Error! No address in Display List ${line.mode}`, line.id);

        if (needsAddress(line) && hasAddress(line) && template) {
            if (template.byte.forceNumeric) isAddressParsable(line);
        }

        if (isJump(line)) {
            hasJump = true;
        }

        if (DLerror) return {error: DLerror, warnings}

        display.bytecode.push(_.times(line.count, i => getLineBytecode(line)));
    }    

    if (!hasJump)
        if (options.validateEndJump)
            addError(`Error! No Jump Command in your list.`);

    display.bytecode = _.flattenDeep(display.bytecode);

    return {error: DLerror, warnings}
}

// *********************************** OPTIONS

const refreshOptions = () => {

    const opts = _.filter($("select, input"), opt => {
        return _.startsWith($(opt).attr('id'),'opt_');
    });
    const newopts = {};
    _.each(opts, opt => {
        const opt_id = $(opt).attr('id');
        const opt_name = _.split(opt_id ,'_');
        const opt_type = opt_name[2];
        const opt_val = options[opt_name[1]];
        $(`#${opt_id}`).val(opt_val);
        if (opt_type == 'b') {
            $(`#${opt_id}`).prop('checked', opt_val);
        }
    });
}

const valIntInput = (inputId) => {
    uint = userIntParse($(`#${inputId}`).val());
    if (_.isNaN(uint)) {
        $(`#${inputId}`).addClass('warn').focus();
        return false;
    };
    $(`#${inputId}`).val(uint);
    return true;
}

const validateOptions = () => {
    $('.dialog_text_input').removeClass('warn');
    //if (!valIntInput('bytes_per_line')) return false;
    return true;
}

const toggleOptions = () => {
    if ($('#options_dialog').is(':visible')) {
        $('#options_dialog').slideUp();
    } else {
        refreshOptions();
        $('#options_dialog').slideDown();
    }
}

const storeOptions = () => {
    localStorage.setItem(defaultOptions.storageName, JSON.stringify(_.omit(options, dontSave)));
}

const storeDisplay = () => {
    localStorage.setItem(`${defaultOptions.storageName}_DL`, JSON.stringify(display));
}

const loadOptions = () => {
    if (!localStorage.getItem(defaultOptions.storageName)) {
        options = _.assignIn({}, defaultOptions);
        storeOptions();
    } else {
        options = _.assignIn({}, defaultOptions, JSON.parse(localStorage.getItem(defaultOptions.storageName)));
    }
}

const loadDisplay = () => {
    if (!localStorage.getItem(`${defaultOptions.storageName}_DL`)) {
        display = _.assignIn({}, _.clone(defaultDisplay));
        storeDisplay();
    } else {
        display = _.assignIn({}, _.clone(defaultDisplay), JSON.parse(localStorage.getItem(`${defaultOptions.storageName}_DL`)));

    }
}

const updateOptions = () => {

    const opts = _.filter($("select, input"), opt => {
        return _.startsWith($(opt).attr('id'),'opt_');
    });
    const newopts = {};
    _.each(opts, opt => {
        const opt_id = $(opt).attr('id');
        const opt_name = _.split(opt_id ,'_');
        let opt_value =  $(`#${opt_id}`).val();
        const opt_type = opt_name[2];
        if (opt_type == 'i') {
            newopts[opt_name[1]] = Number(opt_value);
        };
        if (opt_type == 's') {
            newopts[opt_name[1]] = `${opt_value}`;
        };
        if (opt_type == 'b') {
            newopts[opt_name[1]] = $(`#${opt_id}`).prop('checked');
        };        
    })
    _.assignIn(options, newopts);
    storeOptions();
}

const saveOptions = () => {
    if (validateOptions()) {
        updateOptions();
        toggleOptions();
    }
}


// *********************************** EXPORT


const templateChange = () => {
    updateOptions();
    exportData();
}

const widthChange = () => {
    updateOptions();
    recalcWidths();
    updateListStatus();
}

const toggleExport = () => {
    if ($('#export_dialog').is(':visible')) {
        $('#export_dialog').slideUp();
    } else {
        refreshOptions();
        exportData();
        $('#export_dialog').slideDown();
    }
}

const exportData = () => {
    const template = exportTemplates[$('#opt_lastTemplate_i').val()];
    const {error, warnings} = parseAndValidate(template);
    if (error) {
        $('#export_frame').html(warnings.replace('<br>',''));
        return null;
    }
    const body = parseTemplate(template);
    $('#export_frame').html(body);
}

const parseTemplateVars = (template, size) => {
    return template
        .replace(/#size#/g, size)
        .replace(/#max#/g, size - 1);
}

const parseTemplate = (template) => {
   
    let templateLines = '';
    let listByte = 0;
    let byteInRow = 0;
    let lineCount = 0;
    let lineBody = '';
    const pushLine = line => {
        const num = (template.line.numbers) ? `${template.line.numbers.start + template.line.numbers.step * lineCount} `:'';
        templateLines += `${num}${template.line.prefix}${line}${listByte == display.bytecode.length? template.line.lastpostfix || template.line.postfix : template.line.postfix}`;
        lineCount++;
    }
    const stepByte = () => {
        byteInRow++;
        if (byteInRow == options.bytesPerLine || listByte == display.bytecode.length) {
            byteInRow = 0;
            pushLine(lineBody);
            lineBody = '';
        } else lineBody += template.byte.separator;
    }
    const pushByte = b => {
        if (options.bytesExport == 'HEX') {
            lineBody += `${template.byte.hexPrefix}${decimalToHex(userIntParse(b))}`;
        } else {
            lineBody += b;
        }
        stepByte();
    }
    const pushAddress = a => {
        let addr = isDecOrHexInteger(a) ? userIntParse(a) : a;
        if (options.bytesExport == 'HEX' && isDecOrHexInteger(addr)) {
            addr = `${template.byte.hexPrefix}${decimalToHex(userIntParse(a),4)}`;
        }
        lineBody += `${template.byte.addrPrefix}${addr}${template.byte.addrPostfix}`
        stepByte();
    }

    while (listByte<display.bytecode.length) {
        let cbyte = display.bytecode[listByte++];
        if (cbyte == '#') {
            let caddr = display.bytecode[listByte];
            if (template.byte.forceNumeric) {
                let address = Number(userIntParse(caddr));
                pushByte(address & 0xFF);
                listByte++;
                pushByte((address & 0xFF00)>>8);
            } else {
                listByte++;
                pushAddress(caddr);
            }
        } else {
            pushByte(cbyte);
        }
    }

    if (byteInRow > 0) pushLine(lineBody);

    return parseTemplateVars(`${template.block.prefix}${templateLines}${template.block.postfix}`, display.bytecode.length);
}

const saveFile = () => {
    bintmp = {
        name:'Binary Export',
        block: {
            prefix: '', postfix: ''
        },
        line: {
            numbers: false,
            prefix: '', postfix: ','
        },
        byte: {
            forceNumeric: true, separator: ',',
            hexPrefix: '$'
        }
    };
    const {error, warnings} = parseAndValidate(bintmp);
    if (error) {
        alert(warnings.replace('<br>',''));
        return null;
    }

    if (display.bytecode.length == 0) {
        alert('Saving empty file is pointless...');
        return null;
    }

    const name = prompt('set filename of saved file:', 'display_list.bin');

    let binList = [];
    let listByte = 0;
    while (listByte<display.bytecode.length) {
        let cbyte = display.bytecode[listByte++];
        if (cbyte == '#') {
            let caddr = display.bytecode[listByte];
            let address = Number(userIntParse(caddr));
            binList.push(address & 0xFF);
            listByte++;
            binList.push((address & 0xFF00)>>8);
        } else {
            binList.push(Number(userIntParse(cbyte)) & 0xFF);
        }
    }
    var a = document.createElement('a');
    document.body.appendChild(a);
    var file = new Blob([new Uint8Array(binList)]);
    a.href = URL.createObjectURL(file);
    if (name) {
        a.download = name;
        a.click();
        setTimeout(() => { $(a).remove(); }, 100);
    }
}



// ************************************************  ON START INIT 

$(document).ready(function () {
    loadOptions();
    loadDisplay();
    const app = gui(options);
    refreshOptions();
    $('title').append(` v.${options.version}`);
    app.addMenuItem('New Blank Line', addBlankLine, 'listmenu', 'Inserts blank line into Display List');
    app.addMenuItem('New Screen Line', addScreenLine, 'listmenu', 'Inserts screen line into Display List');
    app.addMenuItem('Clone Last Line', cloneLastLine, 'listmenu', 'Duplicate last DL Line');
    app.addMenuItem('New Jump Line', addJumpLine, 'listmenu', 'Inserts jump line into Display List');
    app.addSeparator('listmenu');
    app.addMenuItem('Clear Display List', clearDL, 'listmenu', 'Deletes all rows');
    app.addSeparator('listmenu');
    app.addMenuItem('Export', toggleExport, 'listmenu', 'Exports Display List to various formats');
    app.addMenuItem('Save binary', saveFile, 'listmenu', 'Saves Display List as a binary file');
    app.addSeparator('listmenu');
    app.addMenuItem('Options', toggleOptions, 'listmenu', 'Shows Options');
    if (display.list.length > 0) redrawList()
    
    updateListStatus();    
});
