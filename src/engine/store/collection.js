/**
 * Collection is just subset of objects from global object storage (odb)
 *
 * API:
 *  add(item)
 *  remove(item)
 *  length
 *
 *  on('add', callback)
 *  on('change', callback)
 *  on('remove', callback)
 *
 *  clear()
 *  pop()
 *  count()
 *  traversal(callback, thisObj)
 */
define([
    'component-emitter',
    'src/engine/store/odb.js'
], function(
    Emitter,
    odb
) {
    function Collection()
    {
        // items is not array because we need an sparse array and array's methods is not applicable
        this.items = {};
        this.length = 0;
    }

    Emitter(Collection.prototype);

    /**
     * @param item
     * @returns boolean true - item added, false - item already in list
     */
    Collection.prototype.add = function(item)
    {
        odb.add(item);

        if (this.items[item.id]) {
            return false; // item already in collection
        }

        this.items[item.id] = item;
        this.length++;

        this.emit('add', item);

        var self = this;
        var listener = function() {
            self.emit('change', this);
        };
        // item must be an emitter
        item.on('change', listener);
        this.on('remove', function(removedItem) {
            if (item == removedItem) {
                item.off('change', listener);
            }
        });

        return true;
    };

    Collection.prototype.get = function(id)
    {
        return this.items[id];
    };

    Collection.prototype.remove = function(item)
    {
        if (this.items[item.id]) {
            this.emit('remove', item);
            this.length--;
            delete this.items[item.id];

            return true;
        } else {
            return false;
        }
    };

    Collection.prototype.clear = function()
    {
        for (var i in this.items) {
            this.emit('remove', this.items[i]);
            delete this.items[i];
        }
        this.length = 0;
    };

    Collection.prototype.pop = function()
    {
        var lastProperty;
        // optimized Object.getOwnPropertyNames(this.items).pop();
        for (lastProperty in this.items);

        if (lastProperty) {
            var item = this.items[lastProperty];
            this.emit('remove', item);
            this.length--;
            delete this.items[lastProperty];
            return item;
        } else {
            return null;
        }
    };

    Collection.prototype.count = function()
    {
        return this.length;
    };

    Collection.prototype.traversal = function(callback, thisObj)
    {
        for (var i in this.items) {
            callback.call(thisObj, this.items[i]);
        }
    };

    /**
     * Bind object to list.
     *
     * All changes in a list's object with same id will reflect in the slaveObject.
     *
     * @deprecated
     *
     * @param slaveObject
     * @return
     */
    Collection.prototype.bindSlave = function(slaveObject)
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

    return Collection;
});
