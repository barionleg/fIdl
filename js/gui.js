const gui = (options) => {
 
    const addMenuItem = (name, handler, parent = 'menulist', hint) => {
        const li = $('<li/>').html(name).addClass('menuitem').bind('click', handler);
        if (hint) li.attr('title', hint);
        li.appendTo(`#${parent}`);
        return li;
    }

    const addSeparator = (parent = 'menulist') => {
        $('<div/>').addClass('menuseparator').appendTo(`#${parent}`)
    }

    const addBR = (parent = 'menulist') => {
        $('<div/>').addClass('menubr').appendTo(`#${parent}`)
    }

    $('#save_options').click(saveOptions);
    $('#close_export').click(toggleExport);
    $('#opt_lastTemplate_i,#opt_bytesExport_s,#opt_bytesPerLine_i').change(templateChange);
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

    return {
        addMenuItem,
        addSeparator,
        addBR
    }
};
