
function BcClient(socket)
{
    this.socket = socket;

    this.vm = null;
    this.codeInterval = null;

    this.users = new TList().bindSource(socket, 'users');
    this.currentUser = new User(); // do not replace
    this.users.bindSlave(this.currentUser);

    this.premades = new TList().bindSource(socket, 'premades');
    this.currentPremade = new Premade(); // do not replace
    this.premades.bindSlave(this.currentPremade);

    this.goals = new TList().bindSource(socket, 'goals');
    this.courses = new TList().bindSource(socket, 'courses');
    this.exercises = new TList().bindSource(socket, 'exercises');

    this.messages = new TList().bindSource(socket, 'messages');
    this.premadeUsers = new TList().bindSource(socket, 'premade.users');
    this.premadeMessages = new TList().bindSource(socket, 'premade.messages');
    // todo move to premade object?
    this.tankStack = new TList().bindSource(socket, 'game.botStack');
    this.socket.on('logged', this.onLogged.bind(this));
    this.socket.on('joined', this.onJoined.bind(this));
    this.socket.on('unjoined', this.onUnjoined.bind(this));
    this.socket.on('started', this.onStarted.bind(this));
    this.socket.on('gameover', this.onGameOver.bind(this));
    this.socket.on('execute', this.onExecute.bind(this));
    this.socket.on('task-done', this.onTaskDone.bind(this));
    this.socket.on('disconnect', this.onDisconnect.bind(this));

    this.field = new Field(13 * 32, 13 * 32);
    TList.prototype.bindSource.call(this.field, socket, 'f');
    this.gameRun = false; // todo another way?
};

Eventable(BcClient.prototype);

BcClient.prototype.onDisconnect = function()
{
    clearInterval(this.botCodeInterval);
    clearInterval(this.codeInterval);
};

BcClient.prototype.onLogged = function(data)
{
    this.currentUser.unserialize(data.user);
};

BcClient.prototype.onJoined = function(data)
{
    // do not replace this.currentPremade
    this.currentPremade.unserialize(data.premade);
};

BcClient.prototype.onUnjoined = function()
{
    // do not replace this.currentPremade
    this.currentPremade.unserialize([]);
    clearInterval(this.botCodeInterval);
};

BcClient.prototype.onStarted = function()
{
    this.gameRun = true;
};

BcClient.prototype.onGameOver = function()
{
    this.gameRun = false;
};

/**
 * @todo implement
 * @param data
 * @return
 */
BcClient.prototype.onExecute = function(data)
{
//    data.script
};

BcClient.prototype.onTaskDone = function(message)
{
    var self = this;
    if (this.vm) {
        if (message) {
            this.emit('write', message + '\n');
        }
        clearInterval(this.codeInterval);
        this.codeInterval = setInterval(function(){
            self.vm.step();
        }, 1);
    }
};

//===== actions ================================================================

BcClient.prototype.connect = function()
{
    this.socket.socket.connect();
};

BcClient.prototype.login = function(nick)
{
    this.socket.emit('login', {
        nick : nick
    });
};

BcClient.prototype.setCourse = function(id)
{
    this.socket.emit('set-course', {
        id: id
    });
};

BcClient.prototype.say = function(text)
{
    this.socket.emit('say', {
        text : text
    });
};

BcClient.prototype.join = function(name, gameType)
{
    this.socket.emit('join', {
        name : name,
        gameType : gameType
    });
};

BcClient.prototype.unjoin = function()
{
    if (this.vm) {
        clearInterval(this.codeInterval);
        this.vm.removeAllListeners();
        this.vm = null;
    }

    this.socket.emit('unjoin');
};

BcClient.prototype.startGame = function(level)
{
    var self = this;
    this.socket.emit('start', {
        level: level
    });
};

BcClient.prototype.stopGame = function()
{
    if (this.currentPremade.type == 'createbot') {
        this.socket.emit('stop-game');
    }

    if (this.vm) {
        clearInterval(this.codeInterval);
        this.vm.removeAllListeners();
        this.vm = null;
    }
};

BcClient.prototype.executeCode = function(code)
{
    if (this.gameRun) {
        this.socket.emit('execute', {
            code: code
        });

        if (this.vm) {
            clearInterval(this.codeInterval);
            this.vm.removeAllListeners();
        }
        try {
            var res = new PascalCompiler(code).parse();
            console.log(res.code);
            this.vm = new Vm(res.code, this);
            var self = this;
            this.vm.on('action', function(action){
                clearInterval(self.codeInterval);
                if (action.move) {
                    self.move(action.move);
                }
                if (action.turn) {
                    self.turn(action.turn);
                }
                if (action.fire) {
                    self.fire();
                }
            });
            this.vm.on('write', function(data){
                self.emit('write', data);
            });
            this.vm.on('terminate', function(action){
                clearInterval(self.codeInterval);
                console.log('terminate');
            });
            this.codeInterval = setInterval(function(){
                self.vm.step();
            }, 1);
        } catch (ex) {
            this.emit('compile-error', ex);
        }
    }
};

BcClient.prototype.control = function(commands)
{
    this.socket.emit('control', commands);
};

BcClient.prototype.turn = function(direction)
{
    this.control({
        turn: direction
    });
};

BcClient.prototype.move = function(distance)
{
    this.control({
        move: distance
    });
};

BcClient.prototype.startMove = function()
{
    this.control({
        startMove: 1
    });
};

BcClient.prototype.stopMove = function()
{
    this.control({
        stopMove: 1
    });
};

BcClient.prototype.fire = function()
{
    this.control({
        fire: 1
    });
};

//===== events =================================================================

// todo named similar to handlers onLogged, onJoined, etc
BcClient.prototype.onConnect = function(handler)
{
    this.socket.on('connect', handler);
};

BcClient.prototype.onConnectFail = function(handler)
{
    this.socket.on('connect_failed', handler).on('error', handler);
};
