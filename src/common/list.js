define(['src/common/event.js'], function(Eventable) {
    /**
     * Don't call Array's methods which modify items, because they don't emit events.
     */
    function TList()
    {
        this.items = [];
    };

    Eventable(TList.prototype);

    TList.prototype.get = function(id)
    {
        return this.items[id];
    };

    TList.prototype.add = function(item)
    {
        if (item.id !== undefined) {
            this.items[item.id] = item;
        } else {
            item.id = this.items.push(item) - 1;
        }

        this.emit('add', item);

        var self = this;
        if (item.on) {
            item.on('change', function(){
                self.emit('change', this);
            });
        }
    };

    TList.prototype.remove = function(item)
    {
        this.emit('remove', item);
        delete this.items[item.id];
    };

    TList.prototype.clear = function()
    {
        for (var i in this.items) {
            this.emit('remove', this.items[i]);
            delete this.items[i];
        }
    };

    TList.prototype.pop = function()
    {
        // do not pop()! beause of "a.pop()" != "delete a[a.length-1]"
        var i = -1;
        for (i in this.items); // not mistake
        if (i == -1) {
            return null;
        }
        var item = this.items[i];
        this.emit('remove', item);
        delete this.items[i];
        return item;
    };

    TList.prototype.getFirst = function(filter)
    {
        for (var i in this.items) {
            if (filter) {
                if (filter(this.items[i])) {
                    return this.items[i];
                }
            } else {
                return this.items[i];
            }
        }
        return null;
    };

    TList.prototype.count = function()
    {
        var n = 0;
        for (var i in this.items) {
            n++;
        }
        return n;
    };

    TList.prototype.traversal = function(callback, thisObj)
    {
        for (var i in this.items) {
            callback.call(thisObj, this.items[i]);
        }
    };

    /**
     * Bind object to list.
     * All changes in a list's object with same id will reflect in the slaveObject.
     * @param slaveObject
     * @return
     */
    TList.prototype.bindSlave = function(slaveObject)
    {
        var self = this;
        var handler = function(each) {
            if (slaveObject.id === each.id) { // id may be 0 or undefined, so ===
                slaveObject.unserialize(each.serialize());
                slaveObject.emit('change');
            }
        };
        this.on('add'   , handler);
        this.on('change', handler);
        this.on('remove', handler);

    };

    TList.prototype.bindSource = function(source, key)
    {
        var self = this;
        source.on('sync', function(data){
            if (data[key]) {
                // todo updateWith defined in serialization.js
                self.updateWith(data[key]);
            }
        });
        source.on('clearCollection', function(data) {
            if (data == key) {
                self.clear();
            }
        });
        return this;
    };

    return TList;
});