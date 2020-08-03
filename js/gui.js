const gui = (options, dropHandler) => {

    let fileDialogs = 0;
 
    const addMenuItem = (name, handler, parent = 'menulist', hint) => {
        const li = $('<li/>').html(name).addClass('menuitem').bind('click', e => {
            event.preventDefault();
            event.stopPropagation();
            if (handler) handler();
        });
        if (hint) li.attr('title', hint);
        li.appendTo(`#${parent}`);
        return li;
    }

    const addMenuFileOpen = (name, handler, parent = 'menulist', hint) => {
        const inp = $(`<input type='file' id='fdialog${fileDialogs}' class='fileinput'>`);
        const label = $('<label/>').attr('for', `fdialog${fileDialogs}`).html(name).addClass('menuitem');
        inp.change(handler);
        if (hint) label.attr('title', hint);
        $(`#${parent}`).append(inp, label);
        fileDialogs++;
        return label;
    }

    const addSeparator = (parent = 'menulist') => {
        $('<div/>').addClass('menuseparator').appendTo(`#${parent}`)
    }

    const addBR = (parent = 'menulist') => {
        $('<div/>').addClass('menubr').appendTo(`#${parent}`)
    }

    $('#save_options').click(saveOptions);
    $('#close_export').click(toggleExport);
    $('#load_preset').click(loadPreset);
    $('#close_presets').click(togglePresets);
    $('#opt_lastTemplate_i,#opt_bytesExport_s,#opt_bytesPerLine_i').change(templateChange);
    $('#user_presets').change(presetChange);

    $('#opt_screenWidth_s').change(widthChange);
    $("select, input").filter( (i,o) => { return _.endsWith($(o).attr('id'),'_b')} ).change(()=>{
        updateOptions();
        updateListStatus();
    });

    _.each(screenWidths,(v,k) => {
        $('#opt_screenWidth_s').append($('<option/>').attr('value',k).html(k));
    });

    for (let templateIdx in exportTemplates) {
        const template = exportTemplates[templateIdx];
        const option = $('<option/>').val(templateIdx).html(template.name);
        $('#opt_lastTemplate_i').append(option);
    };

    for (let presetIdx in dlPresets) {
        const preset = dlPresets[presetIdx];
        const option = $('<option/>').val(presetIdx).html(preset.name);
        $('#user_presets').append(option);
    };

    $('html').on("dragover", function (event) {
        event.preventDefault();
        event.stopPropagation();
    });

    $('html').on("dragleave", function (event) {
        event.preventDefault();
        event.stopPropagation();
    });

    $('#app').on('click', closeAllDialogs);

    $('html').on("drop", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.originalEvent.dataTransfer.files) {
            // Use DataTransferItemList interface to access the file(s)
            for (var i = 0; i < event.originalEvent.dataTransfer.files.length; i++) {
                // If dropped items aren't files, reject them
                const file = event.originalEvent.dataTransfer.files[i];
                if (confirm(`Load new file ${file.name}?`)) {
                    dropHandler(file);
                }
            }
        }

    });

    return {
        addMenuItem,
        addMenuFileOpen,
        addSeparator,
        addBR
    }
};
