

const defaultOptions = {
    version: '0.80',
    storageName: 'FidlStore080',
    screenWidth: 'normal',
    bytesExport: 'HEX',
    bytesPerLine: 10,
    lastTemplate: 0
}
let options = {};

const dontSave = ['version', 'storageName'];

const scanlinesMax = 240;
const maxRamSize = 4096;
const CSVbytesPerLine = 10;

const defaultDisplay = {
    list: [],
    jump: null,
    scanlines: 0,
    videoram: 0,
    bytecode: []
}

let display = {}

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

const promptInt = (txt, defaulttxt) => {
    let uint;
    do {
        const uval = prompt(txt, defaulttxt);
        uint = userIntParse(uval);
        if (_.isNaN(uint)) alert(`*** ERROR: can not parse integer value from ${uval}`);
    } while (_.isNaN(uint))
    return uint;
}

// *********************************** DLIST

const redrawList = () => {
    $("#dlist").empty();
    $("#dljump").empty();
    _.each(display.list,line => guiAddDLLine(line));
    addJump();
} 

const updateModeParams = line => {
    line.antic = DLmodes[line.mode].antic;
    line.hex = decimalToHex(line.antic);
    line.scanlines = DLmodes[line.mode].scanlines * line.count || 0;
    let bpl = DLmodes[line.mode].bpl;
    let b20 = bpl / 5;
    if (options.screenWidth == 'narrow') bpl = bpl - b20;
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
    if (rowId == 'jmp') {
        display.jump = _.assign(display.jump, readRow(rowId))
    } else {
        updateLineFromRow(Number(rowId));
    }
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
        .append(rowInput(line,'address', line.address).attr("disabled", isBlank(line)));
        if (!isJump(line)) {
          lineItem
          .append(rowIcon(line,'arrowDown fa-arrow-alt-circle-down',moveRowDown).attr('title','Move Down'))
          .append(rowIcon(line,'arrowUp fa-arrow-alt-circle-up',moveRowUp).attr('title','Move Up'))
          .append(rowIcon(line,'fa-ban',removeRow).attr('title','Delete Row'));
        }
    $(list).append(lineItem);
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

const cloneLastLine = () => {
    if (display.list.length>0) {
        const rowClone = _.clone(_.last(display.list));
        rowClone.id = getFreeId();
        display.list.push(rowClone);
        guiAddDLLine(_.last(display.list));
        updateListStatus();
    }
}

const addJump = (jump) => {
  display.jump = jump || display.jump || newScreenLine('JVB','jmp');
  guiAddDLLine(display.jump, '#dljump');
}

const clearDL = () => {
    if (confirm('Are You sure??')) {
        display = _.assignIn({}, defaultDisplay);
        redrawList()
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

const updateListStatus = () => {
    const {error, warnings} = parseAndValidate();
    $('#state').html(error?'Display List ERROR!':'Display List OK');
    $('#warnings').html(warnings);
    updateSizes();
    storeDisplay();
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
    $('li').removeClass('rowError');
    
    for (line of display.list) {

        if (!isDecOrHexInteger(line.count)) 
            addError(`Error! Count value '${line.count}' is not an integer.`, line.id);

        display.scanlines += line.scanlines;
        if (display.scanlines > scanlinesMax) 
            addError(`Error! You have exceeded the maximum number of scanlines! (max. ${scanlinesMax} lines).`, line.id);

        display.videoram += line.ram;        
        if (needsAddress(line)) videoram = 0;
        videoram += line.ram;
        if (videoram > maxRamSize) 
            addError(`Error! You have exceeded the maximum size of continuous memory block! (max. ${maxRamSize} bytes).`, line.id);

        if (isScreenLine(line) && firstLine) {
            if (!needsAddress(line)) addError(`Error! First screen line has to point to a memory address (LMS) - ${line.mode}.`, line.id);
            firstLine = false;
        }
              
        if (needsAddress(line) && !hasAddress(line) )
            addError(`Error! No address in Display List ${line.mode}`, line.id);

        if (needsAddress(line) && hasAddress(line) && template) {
            if (template.byte.forceNumeric) isAddressParsable(line);
        }

        if (DLerror) return {error: DLerror, warnings}

        display.bytecode.push(_.times(line.count, i => getLineBytecode(line)));
    }    


    display.bytecode.push(getLineBytecode(display.jump));

    display.bytecode = _.flattenDeep(display.bytecode);
   
    if (display.bytecode.length > 256)
        addError(`Error! Display List size exceeded 256 bytes! Split it using JMP.`);

    if (!hasAddress(display.jump) )
        addError(`Error! No address for Jump Command ${display.jump.mode}.`, display.jump.id);
    
    if (hasAddress(display.jump) && template) {
        if (template.byte.forceNumeric) isAddressParsable(display.jump);

    }


  return {error: DLerror, warnings}
}


const commentIndent = 24;

const parseToAsm = dlist => {
  outText = "display_list\n";
  dlist.forEach((row) => {
    outputLine = `    ${row.count>1?':'+row.count+' ':''}dta $${row.hex}${row.address?', a('+row.address+')':''}`;
    comment = `${' '.repeat(outputLine.length<commentIndent?commentIndent-outputLine.length:1)}; ${row.name} ${row.count>1?'x'+row.count:''}\n`
    outText += outputLine + comment;
  });
  return outText;
}

const showValuesArray = valuesArray => {
  outText = '';
  rowText = '';
  lineCount = 0;
  
  valuesArray.forEach( v => {
      rowText += `${v}, `;
      lineCount++;
      if (lineCount == CSVbytesPerLine) {
        lineCount = 0;
        outText += rowText + "\n";  
        rowText = '';
      }
  });
  outText += rowText;  
  return outText.slice(0, -2);
}

const parseToCSVdec = dlist => {
  valuesArray = [];
  dlist.forEach( row => {
    for (var i=1;i<=row.count;i++)  
      valuesArray.push(row.antic);
    if (hasAddress(row)) {
      address = parseAddress(row);
      valuesArray.push(address.lo);
      valuesArray.push(address.hi);
    }
  });
  return showValuesArray(valuesArray);
}

const parseToCSVhex = dlist => {
  valuesArray = [];
  dlist.forEach( row => {
    for (var i=1;i<=row.count;i++)  
  valuesArray.push(`$${row.hex}`);
    if (hasAddress(row)) {
      address = parseAddress(row);
      valuesArray.push(`$${address.lo.toString(16).padStart(2, '0')}`);
      valuesArray.push(`$${address.hi.toString(16).padStart(2, '0')}`);
    }
  });
  return showValuesArray(valuesArray);
}
 

// *********************************** OPTIONS

const refreshOptions = () => {
    $('#scr_width').val(options.screenWidth);
    $('#bytes_export').val(options.bytesExport);
    $('#bytes_per_line').val(options.bytesPerLine);
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
    if (!valIntInput('bytes_per_line')) return false;
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
        display = _.assignIn({}, defaultDisplay);
        storeDisplay();
    } else {
        display = _.assignIn({}, defaultDisplay, JSON.parse(localStorage.getItem(`${defaultOptions.storageName}_DL`)));

    }
}


const updateOptions = () => {
    _.assignIn(options, {
        screenWidth: $('#scr_width').val(),
        bytesExport: $('#bytes_export').val(),
        lastTemplate: Number($('#export_template').val()),
        bytesPerLine: Number($('#bytes_per_line').val())
    });
    storeOptions();
}


const saveOptions = () => {
    if (validateOptions()) {
        updateOptions();
        toggleOptions();
    }
}


// *********************************** EXPORT

const refreshExports = () => {
    $('#export_template').empty();
    for (let templateIdx in exportTemplates) {
        const template = exportTemplates[templateIdx];
        const option = $('<option/>').val(templateIdx).html(template.name);
        $('#export_template').append(option);
    };
    $('#export_template').val(options.lastTemplate);
    //
}

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
        refreshExports();
        exportData();
        $('#export_dialog').slideDown();
    }
}

const exportData = () => {
    const template = exportTemplates[$('#export_template').val()];
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





// ************************************************  ON START INIT 

$(document).ready(function () {
    loadOptions();
    loadDisplay();
    const app = gui(options);
    refreshExports();
    refreshOptions();
    $('title').append(` v.${options.version}`);
    app.addMenuItem('New Blank Line', addBlankLine, 'listmenu', 'Inserts blank line into Display List');
    app.addMenuItem('New Screen Line', addScreenLine, 'listmenu', 'Inserts screen line into Display List');
    app.addMenuItem('Clone Last Line', cloneLastLine, 'listmenu', 'Duplicate last DL Line');
    app.addSeparator('listmenu');
    app.addMenuItem('Clear Display List', clearDL, 'listmenu', 'Deletes all rows');
    app.addSeparator('listmenu');
    app.addMenuItem('Export', toggleExport, 'listmenu', 'Exports Display List to various formats');
    app.addSeparator('listmenu');
    app.addMenuItem('Options', toggleOptions, 'listmenu', 'Shows Options');
    if (display.list.length > 0) redrawList()
    else addJump();
    updateListStatus();    
  });
