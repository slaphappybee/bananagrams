let dictionary = ["sheet", "plug", "pen", "arrow", "drive", "ocular", "sounds"];

class TileState {
    constructor(position, char, valid) {
        this.position = position;
        this.char = char;
        this.valid = valid;
    }
}

class AnchorState {
    constructor(position, direction, highlighted) {
        this.position = position;
        this.direction = direction;
        this.highlighted = highlighted;
    }
}

class BoardState {
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
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new IntVector2(this.x + other.x, this.y + other.y);
    }

    multiply(factor) {
        return new IntVector2(this.x * factor, this.y * factor);
    }

    asArray() {
        return [this.x, this.y];
    }
}

class CanvasDisplay {
    constructor(canvas, boardState) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.boardState = boardState;
        this.cursorHighlight = null;

        self = this;
        this.canvas.tabIndex = 1000;
        this.canvas.onclick = function(e) { self.handleCanvasClick(e); };
        this.canvas.onkeydown = function(e) { self.handleCanvasKeydown(e); };
        this.canvas.onmousemove = function(e) { self.handleCanvasMousemove(e); };
    }

    handleCanvasClick(e) {
        this.boardState.cursorPosition = new IntVector2(0, 0);
        this.redraw();
    }
    
    handleCanvasKeydown(e) {
        this.boardState.setTile(this.boardState.cursorPosition, new TileState(this.boardState.cursorPosition, e.key, true));
        this.boardState.cursorPosition = this.boardState.cursorPosition.add(new IntVector2(1, 0));
        this.boardState.validateWords();
        this.boardState.generateAnchors();
        this.redraw();
    }

    translateMouseCoordinates(x, y) {
        return new IntVector2(Math.floor(x / 50) - 1, Math.floor(y / 50) - 1);
    }

    handleCanvasMousemove(e) {
        this.cursorHighlight = self.translateMouseCoordinates(e.offsetX, e.offsetY);
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
    }

    drawGrid() {
        for (var i = 0; i < 20; ++i) {
            this.ctx.strokeStyle = "#cccccc";
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(50, 50 * (1 + i));
            this.ctx.lineTo(950, 50 * (1 + i));
            this.ctx.closePath();
            this.ctx.stroke();
        }
        for (var i = 0; i < 20; ++i) {
            this.ctx.strokeStyle = "#cccccc";
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(50 * (1 + i), 50);
            this.ctx.lineTo(50 * (1 + i), 950);
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    drawHighlight() {
        if(self.cursorHighlight == null) return;
        var [baseX, baseY] = self.cursorHighlight.multiply(50).add(new IntVector2(50, 50)).asArray();
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
        var fillStyle = highlighted ? "#999999" : "#bbbbbb";

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

            if(self.cursorHighlight.x == state.position.x + 4 && self.cursorHighlight.y == state.position.y + 4)
                highlighted = true;

            this.drawAnchor(state.position, state.direction, highlighted);
        }
    }
}

function setupGame(canvas){
    var boardState = new BoardState();
    var boardDisplay = new CanvasDisplay(canvas, boardState);
    
    boardDisplay.redraw();
};
