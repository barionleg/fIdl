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
    $('#export_template,#bytes_export,#bytes_per_line').change(templateChange);
    $('#scr_width').change(widthChange);
    scr_width

    _.each(screenWidths,(v,k) => {
        $('#scr_width').append($('<option/>').attr('value',k).html(k));
    });


    return {
        addMenuItem,
        addSeparator,
        addBR
    }
};
