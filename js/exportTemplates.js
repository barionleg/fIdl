//  #size#
//  #max#

const exportTemplates = [
    {
        name:'MADS Assembler',
        block: {
            prefix: 'display_list\n', postfix: ''
        },
        line: {
            numbers: false,
            prefix: '  dta ', postfix: '\n'
        },
        byte: {
            forceNumeric: false, separator: ', ',
            hexPrefix: '$', addrPrefix: 'a(', addrPostfix: ')'
        }
    },    


    {
        name:'Any Assembler',
        block: {
            prefix: 'display_list\n', postfix: ''
        },
        line: {
            numbers: false,
            prefix: '  .BYTE ', postfix: '\n'
        },
        byte: {
            forceNumeric: true, separator: ', ',
            hexPrefix: '$'
        }
    },    


    {
        name:'Raw CSV data',
        block: {
            prefix: '', postfix: ''
        },
        line: {
            numbers: false,
            prefix: '', postfix: ',\n'
        },
        byte: {
            forceNumeric: true, separator: ',',
            hexPrefix: '$'
        }
    },

    {
        name:'Mad-Pascal',
        block: {
            prefix: "var display_list: array [0..#max#] of byte = (\n", postfix: ");"
        },
        line: {
            numbers: false, prefix: '    ', postfix: ",\n", lastpostfix: "\n"
        },
        byte: {
            forceNumeric: true, separator: ', ',
            hexPrefix: '$'
        }
    },

    {
        name:'Action!',
        block: {
            prefix: "BYTE ARRAY DLIST=[\n", postfix: "]"
        },
        line: {
            numbers: false, prefix: '  ', postfix: "\n"
        },
        byte: {
            forceNumeric: true, separator: ' ',
            hexPrefix: '$'
        }
    },

    {
        name:'CC65',
        block: {
            prefix: "unsigned char display_list[#size#] = {\n", postfix: "};"
        },
        line: {
            numbers: false, prefix: '    ', postfix: ",\n", lastpostfix: "\n"
        },
        byte: {
            forceNumeric: true, separator: ', ',
            hexPrefix: '0x'
        }
    },

    {
        name:'BASIC',
        block: {
            prefix: "", postfix: ""
        },
        line: {
            numbers: { start: 10000, step: 10}, prefix: 'DATA ', postfix: "\n"
        },
        byte: {
            forceNumeric: true, separator: ',',
            hexPrefix: ''
        }
    },


    
]
