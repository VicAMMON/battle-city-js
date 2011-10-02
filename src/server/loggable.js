/**
 * This class is for log object changes to lightly sync they with client.
 * This class can log objects with serialize() method and property id.
 * You can't run Loggable() against prototype due to addObject and removeObject
 * will operate with prototype as this.
 */

Loggable = function Loggable(object)
{
    if (object) {
        object.sync = Loggable.prototype.sync;
        object.on('addObject', callback(Loggable.prototype.log, object));
        object.on('removeObject', callback(Loggable.prototype.log, object));
    }
};

/**
 * This method should be attached to addObject events of object container.
 * @param event {
 *      object: {
 *          id: int,
 *          serialize: function
 *      },
 *      type: string, // addObject|change|removeObject
 *      lastSync: int // if you want to delete 'removeObject' events before lastSync
 *  }
 */
Loggable.prototype.log = function(event)
{
    var data = event.object.serialize();
    var current = this.logData, prev = null;
    while (current != null) {
        if (current.data.id == data.id ||
                (event.lastSync && current.type == 'removeObject' && current.time < event.lastSync)) {
            // remove current
            if (prev == null) {
                current = this.logData = current.next;
            } else {
                current = prev.next = current.next;
            }
        } else {
            // to next element
            prev = current;
            current = current.next;
        }
    }
    // insert first element
    var current = {
        time: Date.now(),
        type: event.type,
        data: data
    };
    current.next = this.logData;
    this.logData = current;
    if (event.type == 'addObject') {
        event.object.on('change', callback(Loggable.prototype.log, this));
    }
};

Loggable.prototype.sync = function(lastSync)
{
    var res = [];
    var current = this.logData;
    while (current != null) {
        // as logData is time desc sorted, so walk throw logData while
        // time great than or equal to lastSync and break if:
        if (current.time < lastSync) {
            break;
        }
        res.push({
            type: current.type,
            data: current.data
        });
        // to next element
        current = current.next;
    }
    return res.reverse();
};