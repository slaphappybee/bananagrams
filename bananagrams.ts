let frequencies = {a: 13, b: 3, c: 3, d: 6, e: 18, f:3, g:4, h:3, i:12, j:2, k:2, l:5, m:3, n:8, o:11, p:3, q:2, r:9, s:6, t:9, u:6, v:3, w:3, x:2, y:3, z:2};

// KFY from SO
function shuffleArray(array) {
    for(let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function solitaire() {
    var letters = new Array();
    for(var letter in frequencies) {
        letters.push(Array(frequencies[letter]).fill(letter));
    }
    letters = letters.flat();
    shuffleArray(letters);
    return letters.slice(0, 21).sort();
}

class UsefulMapKVP<K, V> {
    public key: K;
    public value: V;

    constructor(key: K, value: V) {
        this.key = key;
        this.value = value;
    }
}

class UsefulMap<K, V> implements Iterable<[K, V]> {
    private storage : Map<string, UsefulMapKVP<K, V>> = new Map();

    public set(key: K, value: V): void {
        this.storage.set(JSON.stringify(key), new UsefulMapKVP(key, value));
    }

    public get(key: K): V {
        let item = this.storage.get(JSON.stringify(key));
        if (item === undefined) return undefined;
        return item.value;
    }

    public has(key: K): boolean {
        return this.storage.has(JSON.stringify(key));
    }

    public get size(): number {
        return this.storage.size;
    }

    public *[Symbol.iterator]() : Iterator<[K, V]>{
        for(var [_skey, kvp] of this.storage) {
            yield [kvp.key, kvp.value];
        }
    }
}

class TileState {
    char: string;
    valid: boolean;

    constructor(char, valid) {
        this.char = char;
        this.valid = valid;
    }
}

class AnchorState {
    direction: IntVector2;
    highlighted: boolean;

    constructor(direction, highlighted) {
        this.direction = direction;
        this.highlighted = highlighted;
    }
}

class DeckState {
    letters: Array<string>;

    constructor(letters) {
        this.letters = letters;
    }

    hasLetter(letter) {
        return this.letters.indexOf(letter) !== -1;
    }

    addLetter(letter) {
        this.letters = this.letters.concat([letter]).sort();
    }

    removeLetter(letter) {
        let letterIndex = this.letters.indexOf(letter);
        this.letters = this.letters.slice(0, letterIndex).concat(this.letters.slice(letterIndex + 1, this.letters.length));
    }
}

class DictionaryProvider {
    private words: Array<string>;

    constructor() {
        this.words = null;

        var self = this;
        var jsonQuery = new XMLHttpRequest();
        jsonQuery.open("GET", "https://cdn.rawgit.com/dwyl/english-words/master/words_dictionary.json", true);
        jsonQuery.onreadystatechange = function() {
            if (jsonQuery.readyState === 4 && jsonQuery.status == 200) {
                self.words = Object.keys(JSON.parse(jsonQuery.responseText));
                console.log("JSON dictionary data loaded OK");
            }
        }
        jsonQuery.send()
    }

    public ready(): boolean {
        return this.words != null;
    }

    public hasWord(word: string): boolean {
        return this.words.indexOf(word) != -1;
    }
}

class BoardState {
    tiles: UsefulMap<IntVector2, TileState>;
    anchors: UsefulMap<IntVector2, AnchorState>;
    cursorPosition: IntVector2;
    cursorDirection: IntVector2;
    dictionary: DictionaryProvider;

    constructor() {
        this.tiles = new UsefulMap();
        this.anchors = new UsefulMap();
        this.cursorPosition = null;
        this.cursorDirection = null;
        this.dictionary = new DictionaryProvider();
    }

    generateAnchors() {
        this.anchors = new UsefulMap();
        for (const [position, state] of this.tiles) {
            var rightNeighbourPosition = position.add(new IntVector2(1, 0));
            if(!this.tiles.has(rightNeighbourPosition)) {
                this.anchors.set(rightNeighbourPosition, new AnchorState(new IntVector2(1, 0), false));
            }

            var downNeighbourPosition = position.add(new IntVector2(0, 1));
            if(!this.tiles.has(downNeighbourPosition)) {
                this.anchors.set(downNeighbourPosition, new AnchorState(new IntVector2(0, 1), false));
            }
        }
    }

    public getWordAt(position: IntVector2, direction: IntVector2) : string {
        var letters = new Array<string>();
        while(this.tiles.has(position)) {
            letters.push(this.tiles.get(position).char);
            position = position.add(direction);
        }

        return letters.join("")
    }

    validateWords() {
        console.log("validateWords()");
        
        for (const [_position, state] of this.tiles)
            state.valid = true;

        for (var direction of [new IntVector2(1, 0), new IntVector2(0, 1)]) {
            var origins = new Set<string>();
            var trackback = direction.multiply(-1);

            for (const [position, state] of this.tiles) {
                var pointer = position;
                for(; this.tiles.has(pointer); pointer = pointer.add(trackback));
                
                if(!pointer.add(direction).equals(position))
                    origins.add(JSON.stringify(pointer.add(direction)));
            }

            for (const origin of origins) {
                var positionJson: any = JSON.parse(origin);
                var position = new IntVector2(positionJson.x, positionJson.y)
                if (!this.dictionary.hasWord(this.getWordAt(position, direction))) {
                    var pointer = position;
                    for (; this.tiles.has(pointer); pointer = pointer.add(direction))
                        this.tiles.get(pointer).valid = false;
                }
            }
        }
    }
}

class IntVector2 {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(other: IntVector2): IntVector2 {
        return new IntVector2(this.x + other.x, this.y + other.y);
    }

    multiply(factor: number): IntVector2 {
        return new IntVector2(this.x * factor, this.y * factor);
    }

    asArray() : [number, number] {
        return [this.x, this.y];
    }

    equals(other: IntVector2): boolean {
        return this.x == other.x && this.y == other.y;
    }
}

class CanvasDrawer {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private cellWidth : number = 50;  // Width/height of a cell
    private gridSize : number = 18;  // Number of cells displayed in a row/column
    private gridOrigin: IntVector2 = new IntVector2(50, 50);  // Margin between canvas origin and grid origin
    private coordinatesOffset: IntVector2 = new IntVector2(4, 4);  // Coordinates in the grid of the tile #(0, 0)

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.context = this.canvas.getContext("2d");
    }

    public drawGrid() {
        this.context.strokeStyle = "#cccccc";
        this.context.lineWidth = 0.5;

        for (var i = 0; i < this.gridSize + 1; ++i) {
            this.context.beginPath();
            this.context.moveTo(this.cellWidth, this.cellWidth * (1 + i));
            this.context.lineTo(this.cellWidth * (this.gridSize + 1), this.cellWidth * (1 + i));
            this.context.closePath();
            this.context.stroke();
        }
        for (var i = 0; i < this.gridSize + 1; ++i) {
            this.context.beginPath();
            this.context.moveTo(this.cellWidth * (1 + i), this.cellWidth);
            this.context.lineTo(this.cellWidth * (1 + i), this.cellWidth * (this.gridSize + 1));
            this.context.closePath();
            this.context.stroke();
        }
    }

    private getCellPosition(position: IntVector2) : [number, number] {
        return position.add(this.coordinatesOffset).multiply(this.cellWidth).add(this.gridOrigin).asArray();
    }

    public translateMouseCoordinates(x: number, y: number): IntVector2 {
        var [x2, y2] = new IntVector2(x, y).add(this.gridOrigin.multiply(-1)).multiply(1 / this.cellWidth).add(this.coordinatesOffset.multiply(-1)).asArray()
        return new IntVector2(Math.floor(x2), Math.floor(y2));
    }

    public drawHighlight(position: IntVector2, color: string) {
        var [baseX, baseY] = this.getCellPosition(position);
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.moveTo(baseX, baseY);
        this.context.lineTo(baseX + this.cellWidth, baseY);
        this.context.lineTo(baseX + this.cellWidth, baseY + this.cellWidth);
        this.context.lineTo(baseX, baseY + this.cellWidth);
        this.context.lineTo(baseX, baseY);
        this.context.closePath();
        this.context.fill();
    }

    public drawAnchor(position: IntVector2, direction: IntVector2, highlighted: boolean) {
        var fillStyle = highlighted ? "#999999" : "#eeeeee";
        var [baseX, baseY] = this.getCellPosition(position);
        this.context.fillStyle = fillStyle;
        
        this.context.beginPath();
        this.context.moveTo(baseX, baseY);

        if(direction.x == 1 && direction.y == 0) {
            this.context.lineTo(baseX, baseY + this.cellWidth);
            this.context.lineTo(baseX + 25, baseY + 25);
        }
        if(direction.x == 0 && direction.y == 1) {
            this.context.lineTo(baseX + this.cellWidth, baseY);
            this.context.lineTo(baseX + 25, baseY + 25);
        }

        this.context.lineTo(baseX, baseY);
        this.context.closePath();
        this.context.fill();
    }
}

class CanvasDisplay {
    canvas: any;
    ctx: any;
    canvasDrawer: CanvasDrawer;
    boardState: BoardState;
    deckState: DeckState;
    cursorHighlight: IntVector2;

    constructor(canvas, boardState, deckState) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.canvasDrawer = new CanvasDrawer(canvas);
        this.boardState = boardState;
        this.deckState = deckState;
        this.cursorHighlight = null;

        var self = this;
        this.canvas.tabIndex = 1000;
        this.canvas.onclick = function(e) { self.handleCanvasClick(e); };
        this.canvas.onkeydown = function(e) { self.handleCanvasKeydown(e); };
        this.canvas.onmousemove = function(e) { self.handleCanvasMousemove(e); };
    }

    handleCanvasClick(e) {
        let position = this.canvasDrawer.translateMouseCoordinates(e.offsetX, e.offsetY);
        this.boardState.cursorPosition = position;
        if(this.boardState.anchors.has(position)) {
            this.boardState.cursorDirection = this.boardState.anchors.get(position).direction;
        } else {
            this.boardState.cursorDirection = new IntVector2(1, 0);
        }
        this.redraw();
    }
    
    handleCanvasKeydown(e) {
        if(this.deckState.hasLetter(e.key)) {
            this.deckState.removeLetter(e.key);
            let currentTile = this.boardState.tiles.get(this.boardState.cursorPosition);
            if(currentTile) {
                this.deckState.addLetter(currentTile.char);
            }

            this.boardState.tiles.set(this.boardState.cursorPosition, new TileState(e.key, true));
            this.boardState.cursorPosition = this.boardState.cursorPosition.add(this.boardState.cursorDirection);
            this.boardState.validateWords();
            this.boardState.generateAnchors();
            this.redraw();
        }
    }

    handleCanvasMousemove(e) {
        this.cursorHighlight = this.canvasDrawer.translateMouseCoordinates(e.offsetX, e.offsetY);
        this.redraw();
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvasDrawer.drawGrid();
        this.drawHighlight("#eeeeee");
        this.drawTiles();
        if(this.boardState.cursorPosition) {
            this.drawChar(this.boardState.cursorPosition, "_", "#ff0000");
        }
        if(this.boardState.tiles.size == 0) {
            this.canvasDrawer.drawAnchor(new IntVector2(0, 0), new IntVector2(1, 0), false);
        } else {
            this.drawAnchors();
        }
        this.drawDeck();
    }

    drawDeck() {
        var xPos = 0;
        var yPos = 0;
        for (var char of this.deckState.letters) {
            var textXY = new IntVector2(12, 40).add(new IntVector2(1000, 200)).add(new IntVector2(xPos, yPos));
            this.ctx.font = '50px serif';
            this.ctx.fillStyle = "#cccccc";
            this.ctx.fillText(char, textXY.x, textXY.y);
            xPos += 50;
            if(xPos > 700) {
                xPos = 0;
                yPos += 50;
            }
        }
    }

    drawHighlight(color: string) {
        if(this.cursorHighlight == null) return;
        this.canvasDrawer.drawHighlight(this.cursorHighlight, color);
    }

    drawTiles() {
        for (const [position, state] of this.boardState.tiles) {
            this.drawChar(position, state.char, state.valid ? "#000000": "#f00000");
        }
    }

    drawChar(position, char = "?", color = "#cccccc") {
        // origin is (5, 5)
        var textXY = position.multiply(50).add(new IntVector2(12, 40)).add(new IntVector2(250, 250))
        this.ctx.font = '50px serif';
        this.ctx.fillStyle = color;
        this.ctx.fillText(char, textXY.x, textXY.y);
    }

    drawAnchors() {
        for (const [position, state] of this.boardState.anchors) {
            var highlighted = false;

            if(this.cursorHighlight.x == position.x && this.cursorHighlight.y == position.y)
                highlighted = true;

            this.canvasDrawer.drawAnchor(position, state.direction, highlighted);
        }
    }
}

function setupGame(canvas){
    var boardState = new BoardState();
    var deckState = new DeckState(solitaire());
    var boardDisplay = new CanvasDisplay(canvas, boardState, deckState);
    

    boardDisplay.redraw();
};
