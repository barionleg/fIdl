const DLmodes = {
    "TXT 40x24 2c":     { basic:0,    antic:2,      bpl:40,     scanlines:8  },
    "TXT 40x24 2c x":   { basic:'-',  antic:3,      bpl:40,     scanlines:10 },
    "TXT 40x24 5c":     { basic:12,   antic:4,      bpl:40,     scanlines:8  },
    "TXT 40x12 5c":     { basic:13,   antic:5,      bpl:40,     scanlines:16 },
    "TXT 20x24 5c":     { basic:1,    antic:6,      bpl:20,     scanlines:8  },
    "TXT 20x12 5c":     { basic:2,    antic:7,      bpl:20,     scanlines:16 },
    "GFX 40x24 4c":     { basic:3,    antic:8,      bpl:10,     scanlines:8  },
    "GFX 80x48 2c":     { basic:4,    antic:9,      bpl:10,     scanlines:4  },
    "GFX 80x48 4c":     { basic:5,    antic:10,     bpl:20,     scanlines:4  },
    "GFX 160x96 2c":    { basic:6,    antic:11,     bpl:20,     scanlines:2  },
    "GFX 160x96 4c":    { basic:7,    antic:13,     bpl:40,     scanlines:2  },
    "GFX 160x192 2c":   { basic:14,   antic:12,     bpl:20,     scanlines:1  },
    "GFX 160x192 4c":   { basic:15,   antic:14,     bpl:40,     scanlines:1  },
    "GFX 320x192 2c":   { basic:8,    antic:15,     bpl:40,     scanlines:1  },
 
    "1 BLANK":          { basic:"-",  antic:0,      bpl:0,      scanlines:1 },
    "2 BLANKS":         { basic:"-",  antic:16,     bpl:0,      scanlines:2 },
    "3 BLANKS":         { basic:"-",  antic:32,     bpl:0,      scanlines:3 },
    "4 BLANKS":         { basic:"-",  antic:48,     bpl:0,      scanlines:4 },
    "5 BLANKS":         { basic:"-",  antic:64,     bpl:0,      scanlines:5 },
    "6 BLANKS":         { basic:"-",  antic:80,     bpl:0,      scanlines:6 },
    "7 BLANKS":         { basic:"-",  antic:96,     bpl:0,      scanlines:7 },
    "8 BLANKS":         { basic:"-",  antic:112,    bpl:0,      scanlines:8 },
 
    "JMP":              { basic:"-",  antic:1,      bpl:0,      scanlines:1 },
    "JVB":              { basic:"-",  antic:65,     bpl:0,      scanlines:1 }
}
const screenWidths = {
    narrow: 32,
    normal: 40,
    wide: 48
}