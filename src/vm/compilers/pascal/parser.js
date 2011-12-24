
PascalCompiler = function PascalCompiler(code)
{
    this.code = code;
    this.cur = 0;

    this.line = 1;
    this.char = 1;
    this.posStack = []; // stack to save cursor positions to properly show error place
};

PascalCompiler.prototype.isSpace = /\s/;
PascalCompiler.prototype.isNum = /[0-9]/;
PascalCompiler.prototype.isChar = /[a-z]/i;
PascalCompiler.prototype.isSymbol = /\w/i;
PascalCompiler.prototype.isKeyword = /program|var|begin|end/i;

PascalCompiler.prototype.parse = function()
{
    return this.parseProgram();
};

PascalCompiler.prototype.parseProgram = function()
{
    var symbolTable = new SymbolTable();
    symbolTable.addFunc('move', ['integer'], 'move');
    symbolTable.addFunc('turn', ['string'], 'turn');
    var code = [];
    this.eatIdentifier('Program');
    var name = this.parseIdentifier();
    this.token(';');
    this.parseBlock(code, symbolTable);
    this.token('.');
    return {
        code: code,
        symbolTable: symbolTable
    };
};

PascalCompiler.prototype.parseBlock = function(code, symbolTable)
{
    if (this.lookIdentifier() == 'var') {
        this.parseVariableDeclaration(symbolTable);
    }
    this.parseBlock5(code, symbolTable);
};

PascalCompiler.prototype.parseVariableDeclaration = function(symbolTable)
{
    var vars, type, v;
    this.eatIdentifier('var');
    while (true) {
        if (this.isKeyword.test(this.lookIdentifier())) {
            break;
        }
        vars = [];
        do {
            vars.push(this.parseIdentifier());
        } while (this.look() == ',' && this.token(','));
        this.token(':');
        type = this.parseIdentifier();

        try {
            while (v = vars.pop()) {
                symbolTable.addVar(v, type);
            }
        } catch (ex) {
            throw new Error(ex.message + ' at ' + this.formatPos());
        }

        if (this.look() == ';') {
            this.token(';');
        } else {
            break;
        }
    }
};

PascalCompiler.prototype.parseBlock5 = function(code, symbolTable)
{
    this.eatIdentifier('begin');
    this.parseStatementList(code, symbolTable);
    this.eatIdentifier('end');
};

PascalCompiler.prototype.parseStatementList = function(code, symbolTable)
{
    while (true) {
        var look = this.lookIdentifier();
        if (look.length > 0 && !this.isKeyword.test(look)) {
            var name = this.parseIdentifier();
            this.token('(');
            var param = this.parseExpression();
            this.token(')');
            var func = symbolTable.look(look, [param.type]);
            console.log(func);
            if (func) {
                if (func.inline) {
                    code.push(func.inline);
                    code.push(param.value);
                } else {
                    // todo call user defuned function
                }
            } else {
                throw new Error('Undefined function or procedure "' + name
                        + '(' + param.type + ')' + '" at ' + this.formatPos());
            }
        }
        if (this.lookIdentifier() == 'end') {
            break;
        }
        this.token(';');
    }
};

PascalCompiler.prototype.parseExpression = function()
{
    if (this.test(this.isNum)) {
        return {
            type: 'integer',
            value: this.parseNumber()
        };
    } else if (this.test("'")) {
        return {
            type: 'string',
            value: this.parseString()
        };
    } else {
        throw new Error('Unexpected "' + this.look() + '". Expression expected at ' + this.formatPos());
    }
};

PascalCompiler.prototype.parseNumber = function()
{
    var next;
    if (next = this.test(this.isNum)) {
        var res = 0;
        while (next = this.test(this.isNum)) {
            res = res * 10 + parseInt(next);
            this.eat(next);
        }
        this.eatWs();
        return res;
    } else {
        throw new Error('Unexpected "' + this.look() + '". Num expected at ' + this.formatPos());
    }
};

PascalCompiler.prototype.parseString = function()
{
    this.eat("'");
    var next;
    var res = '';
    while (!this.test("'")) {
        next = this.look();
        res += next;
        this.eat(next);
    }
    this.eat("'");
    this.eatWs();
    return res;
};

PascalCompiler.prototype.testIdentifier = function(identifier)
{
    this.pushCur();
    var res = this.parseIdentifier();
    this.popCur();
    return res == identifier;
};

PascalCompiler.prototype.eatIdentifier = function(identifier)
{
    this.pushPos();
    if (this.parseIdentifier() != identifier) {
        throw new Error(identifier + ' expected at ' + this.formatPos());
    }
    this.popPos();
};

PascalCompiler.prototype.parseIdentifier = function()
{
    var next;
    if (next = this.test(this.isChar)) {
        var res = '';
        while (next = this.test(this.isSymbol)) {
            res += next;
            this.eat(next);
        }
        this.eatWs();
        return res;
    } else {
        throw new Error('Unexpected "' + this.look() + '". Identifier expected at ' + this.formatPos());
    }
};

PascalCompiler.prototype.look = function()
{
    return this.code.charAt(this.cur);
};

PascalCompiler.prototype.lookIdentifier = function()
{
    this.pushCur();
    var next, res = false;
    if (next = this.test(this.isChar)) {
        res = '';
        while (next = this.test(this.isSymbol)) {
            res += next;
            this.eat(next);
        }
    }
    this.popCur();
    return res;
};

/**
 * @param char char || RegExp
 * @return
 */
PascalCompiler.prototype.test = function(check)
{
    var res = this.look();
    if (check) {
        if ((typeof check == 'string') && res != check ||
            (typeof check == 'object') && !check.test(res)) {
            return false;
        }
    }
    return res;
};

/**
 * @param char should not be '\n'
 */
PascalCompiler.prototype.eat = function(char)
{
    if (this.look() == char) {
        this.cur++;
        this.char++;
    } else {
        throw new Error('"' + char + '" expected at ' + this.formatPos() + ', but "' + this.look() + '" given');
    }
};

PascalCompiler.prototype.token = function(char)
{
    this.eat(char);
    this.eatWs();
    return true;
};

PascalCompiler.prototype.eatWs = function()
{
    while (this.isSpace.test(this.look())) {
        if (this.look() == '\n') {
            this.line++;
            this.char = 1;
        } else {
            this.char++;
        }
        this.cur++;
    }
};

PascalCompiler.prototype.formatPos = function()
{
    if (this.posStack.length > 0) {
        var pos = this.popPos();
        return 'line: ' + pos.line + ', char: ' + pos.char;
    } else {
        return 'line: ' + this.line + ', char: ' + this.char;
    }
};

PascalCompiler.prototype.pushPos = function()
{
    this.posStack.push({line: this.line, char: this.char});
};

PascalCompiler.prototype.popPos = function()
{
    return this.posStack.pop();
};

PascalCompiler.prototype.pushCur = function()
{

    this.posStack.push({line: this.line, char: this.char, cur: this.cur});
};

PascalCompiler.prototype.popCur = function()
{
    var pos   = this.posStack.pop();
    this.line = pos.line;
    this.char = pos.char;
    this.cur  = pos.cur;
};