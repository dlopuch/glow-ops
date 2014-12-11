/**
 * A socket connection to some devopsd daemon.  A {DevopsdConnection} is an instanceof {EventEmitter}.
 *
 * Periodically pings devopsd daemons, and emits events when they respond with data.
 */
var _ = require('lodash'),
    util = require('util'),
    events = require('events'),
    nssocket = require('nssocket');

function DevopsdConnection(options) {
  options = _.defaults(options || {}, {
    port: 8320
  });

  var self = this,
      socket = this.socket = new nssocket.NsSocket({
        // Don't use nssocket reconnect -- exponential backoff, so it will never reconnect if connection goes down for
        // a little bit.
        // reconnect: true  DON'T USE!
      });

  socket.on('error', function(error) {
    self.emit('error', error);
  });

  setInterval(function tryReconnect() {
    if (!self.isConnected()) {
      socket.connect(options.port);
    }
  }, 2000);

  socket.on('start', function() {
    function pollForStatus() {
      console.log("Polling " + options.port + " for status update");
      socket.send('webServer.isProcessUp');
      socket.send('webServer.isAcceptingRequests');
    }

    // On initial connection, send off first few requests
    pollForStatus();

    // Keep pinging server every few seconds
    this._pollForStatusInterval = setInterval(pollForStatus, 5000);
  });

  // Now register handlers for all devopsd reponses
  socket.data('webServer.isProcessUp', function(data) {
    if (!data || !data.success) {
      return self.emit('error', new Error('Error checking isProcessUp: ' + (data && data.error)));
    }

    self.isProcessUp = !!data.results;
    self.emit('isProcessUp', !!data.results);
  });
  socket.data('webServer.isAcceptingRequests', function(data) {
    if (!data || !data.success) {
      return self.emit('error', new Error('Error checking isAcceptingRequests: ' + (data && data.error)));
    }

    self.isAcceptingRequests = !!data.results;
    self.emit('isAcceptingRequests', !!data.results);
  });
  socket.data('broadcast.webServer.activity', function(data) {
    // log activity.  data will be 'info', 'warn', or 'error'
    self.emit('activity', data);
  });

  socket.connect(options.port);
}

util.inherits(DevopsdConnection, events.EventEmitter);

DevopsdConnection.prototype.isConnected = function() {
  return this.socket.socket && this.socket.connected;
};

module.exports = DevopsdConnection;