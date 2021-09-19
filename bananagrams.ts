let dictionary = ["sheet", "plug", "pen", "arrow", "drive", "ocular", "sounds"];  // unused
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

class TileState {
    position: IntVector2;
    char: string;
    valid: boolean;

    constructor(position, char, valid) {
        this.position = position;
        this.char = char;
        this.valid = valid;
    }
}

class AnchorState {
    position: IntVector2;
    direction: IntVector2;
    highlighted: boolean;

    constructor(position, direction, highlighted) {
        this.position = position;
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

class BoardState {
    tiles: Map<String, TileState>;
    anchors: Map<String, AnchorState>;
    cursorPosition: IntVector2;
    cursorDirection: IntVector2;

    constructor() {
        this.tiles = new Map();
        this.anchors = new Map();
        this.cursorPosition = null;
        this.cursorDirection = null;
    }

    setTile(position, tileState) {
        this.tiles.set(JSON.stringify(position), tileState);
    }

    getTile(position) {
        return this.tiles.get(JSON.stringify(position));
    }

    iterateTiles() {
        return this.tiles;
    }

    generateAnchors() {
        this.anchors = new Map();
        for (const [_, state] of this.tiles) {
            var rightNeighbourPosition = state.position.add(new IntVector2(1, 0));
            if(!this.tiles.has(JSON.stringify(rightNeighbourPosition))) {
                this.anchors.set(JSON.stringify(rightNeighbourPosition), new AnchorState(rightNeighbourPosition, new IntVector2(1, 0), false));
            }

            var downNeighbourPosition = state.position.add(new IntVector2(0, 1));
            if(!this.tiles.has(JSON.stringify(downNeighbourPosition))) {
                this.anchors.set(JSON.stringify(downNeighbourPosition), new AnchorState(downNeighbourPosition, new IntVector2(0, 1), false));
            }
        }
    }

    validateWords() {
    }
}

class IntVector2 {
    x: number;
    y: number;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new IntVector2(this.x + other.x, this.y + other.y);
    }

    multiply(factor: number) {
        return new IntVector2(this.x * factor, this.y * factor);
    }

    asArray() {
        return [this.x, this.y];
    }
}

class CanvasDisplay {
    canvas: any;
    ctx: any;
    boardState: BoardState;
    deckState: DeckState;
    cursorHighlight: IntVector2;

    constructor(canvas, boardState, deckState) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
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
        let position = this.translateMouseCoordinates(e.offsetX, e.offsetY).add(new IntVector2(4, 4).multiply(-1));
        this.boardState.cursorPosition = position;
        if(this.boardState.anchors.has(JSON.stringify(position))) {
            this.boardState.cursorDirection = this.boardState.anchors.get(JSON.stringify(position)).direction;
        } else {
            this.boardState.cursorDirection = new IntVector2(1, 0);
        }
        this.redraw();
    }
    
    handleCanvasKeydown(e) {
        if(this.deckState.hasLetter(e.key)) {
            this.deckState.removeLetter(e.key);
            let currentTile = this.boardState.getTile(this.boardState.cursorPosition);
            if(currentTile) {
                this.deckState.addLetter(currentTile.char);
            }

            this.boardState.setTile(this.boardState.cursorPosition, new TileState(this.boardState.cursorPosition, e.key, true));
            this.boardState.cursorPosition = this.boardState.cursorPosition.add(this.boardState.cursorDirection);
            this.boardState.validateWords();
            this.boardState.generateAnchors();
            this.redraw();
        }
    }

    translateMouseCoordinates(x, y) {
        return new IntVector2(Math.floor(x / 50) - 1, Math.floor(y / 50) - 1);
    }

    handleCanvasMousemove(e) {
        this.cursorHighlight = this.translateMouseCoordinates(e.offsetX, e.offsetY);
        this.redraw();
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawHighlight();
        this.drawTiles();
        if(this.boardState.cursorPosition) {
            this.drawChar(this.boardState.cursorPosition, "_", "#ff0000");
        }
        if(this.boardState.iterateTiles().size == 0) {
            this.drawAnchor(new IntVector2(0, 0), new IntVector2(1, 0), false);
        } else {
            this.drawAnchors();
        }
        this.drawDeck();
    }

    drawGrid() {
        for (var i = 0; i < 19; ++i) {
            this.ctx.strokeStyle = "#cccccc";
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(50, 50 * (1 + i));
            this.ctx.lineTo(950, 50 * (1 + i));
            this.ctx.closePath();
            this.ctx.stroke();
        }
        for (var i = 0; i < 19; ++i) {
            this.ctx.strokeStyle = "#cccccc";
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(50 * (1 + i), 50);
            this.ctx.lineTo(50 * (1 + i), 950);
            this.ctx.closePath();
            this.ctx.stroke();
        }
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

    drawHighlight() {
        if(this.cursorHighlight == null) return;
        var [baseX, baseY] = this.cursorHighlight.multiply(50).add(new IntVector2(50, 50)).asArray();
        this.ctx.fillStyle = "#eeeeee";
        this.ctx.beginPath();
        this.ctx.moveTo(baseX, baseY);
        this.ctx.lineTo(baseX + 50, baseY);
        this.ctx.lineTo(baseX + 50, baseY + 50);
        this.ctx.lineTo(baseX, baseY + 50);
        this.ctx.lineTo(baseX, baseY);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawTiles() {
        for (const [_, state] of this.boardState.tiles) {
            this.drawChar(state.position, state.char, state.valid ? "#000000": "#f00000");
        }
    }

    drawChar(position, char = "?", color = "#cccccc") {
        // origin is (5, 5)
        var textXY = position.multiply(50).add(new IntVector2(12, 40)).add(new IntVector2(250, 250))
        this.ctx.font = '50px serif';
        this.ctx.fillStyle = color;
        this.ctx.fillText(char, textXY.x, textXY.y);
    }

    drawAnchor(position, direction, highlighted) {
        var fillStyle = highlighted ? "#999999" : "#eeeeee";

        if(direction.x == 1 && direction.y == 0) {
            var [baseX, baseY] = [250 + position.x * 50, 250 + position.y * 50];
            this.ctx.fillStyle = fillStyle;
            this.ctx.beginPath();
            this.ctx.moveTo(baseX, baseY);
            this.ctx.lineTo(baseX, baseY + 50);
            this.ctx.lineTo(baseX + 25, baseY + 25);
            this.ctx.lineTo(baseX, baseY);
            this.ctx.closePath();
            this.ctx.fill();
        }
        if(direction.x == 0 && direction.y == 1) {
            var [baseX, baseY] = [250 + position.x * 50, 250 + position.y * 50];
            this.ctx.fillStyle = fillStyle;
            this.ctx.beginPath();
            this.ctx.moveTo(baseX, baseY);
            this.ctx.lineTo(baseX + 50, baseY);
            this.ctx.lineTo(baseX + 25, baseY + 25);
            this.ctx.lineTo(baseX, baseY);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }

    drawAnchors() {
        for (const [_, state] of this.boardState.anchors) {
            var highlighted = false;

            if(this.cursorHighlight.x == state.position.x + 4 && this.cursorHighlight.y == state.position.y + 4)
                highlighted = true;

            this.drawAnchor(state.position, state.direction, highlighted);
        }
    }
}

function setupGame(canvas){
    var boardState = new BoardState();
    var deckState = new DeckState(solitaire());
    var boardDisplay = new CanvasDisplay(canvas, boardState, deckState);
    

    boardDisplay.redraw();
};
