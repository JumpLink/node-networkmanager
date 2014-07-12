/*
  to old dokumentation? https://wiki.gnome.org/Projects/NetworkManager/DBusInterface/LatestDBusAPI
  new doku? https://developer.gnome.org/NetworkManager/unstable/spec.html
  current? https://developer.gnome.org/NetworkManager/0.9/spec.html
  see also: https://developer.gnome.org/NetworkManager/0.9/
*/


var util = require('util');
var Netmask = require('netmask').Netmask
var _debugEvent = require('debug')('event');
var debugEvent = function (name, arg1, arg2, arg3, arg4, arg5) {
  if(!arg1) arg1 = '';
  if(!arg2) arg2 = '';
  if(!arg3) arg3 = '';
  if(!arg4) arg4 = '';
  if(!arg5) arg5 = '';
  _debugEvent(name, arg1, arg2, arg3, arg4, arg5);
}
var _debugIface = require('debug')('iface');
var debugIface = function(object) {
  if(_debugIface)
    _debugIface(object.interfaceName, "\n"+util.inspect(object, showHidden=false, depth=2, colorize=true)+"\n");
};
var _debug = require('debug')('info');
var debug = function(object) {
  if(_debug)
    _debug("\n"+util.inspect(object, showHidden=false, depth=2, colorize=true)+"\n");
};
var warn = require('debug')('warn');
var DBus = require('dbus'); 
var dbus = new DBus();
var events = require('events');

//var nm = new events.EventEmitter();
var nm = {};
var bus;
var TIMEOUTDELAY = 30000;
var INTERVALDELAY = 100;

/*
 * Wait for dbus service
 */
waitForService = function (findServiceName, timeoutDelay, intervalDelay, callback) {
  bus.getInterface('org.freedesktop.DBus', '/', 'org.freedesktop.DBus', function(err, iface) {
    var timeout, interval;

    if(err) { return callback(err); } else {
      var checkService = function (callback) {
        debug("looking for dbus service");
        iface.ListNames['finish'] = function(serviceList) {
          for (index = 0; index < serviceList.length; ++index) {
            if(serviceList[index] === findServiceName) {
              return callback(true);
            }
          }
          return callback(false);
        }
        iface.ListNames();
      }

      timeout = setTimeout(function () {
        debug("timeout");
        clearInterval(interval);
        return callback("timeout");
      }, timeoutDelay);
      
      interval = setInterval(function() {
        checkService(function (found) {
          if (found) {
            clearInterval(interval);
            clearTimeout(timeout);
            callback(null);
          }
        });
      }, intervalDelay);
    }
  });
}

// var watchProperties = function (valueToSet, serviceName, objectPath, callback) {
//   bus.getInterface(serviceName, objectPath, 'org.freedesktop.DBus.Properties', function(err, iface) {
//     if(err) {
//       callback(err);
//     } else {
//       iface.on('PropertiesChanged', function(interfaceName, value) {
//         var valueKey = Object.keys(value)[0];
//         var signalName = valueKey+"Changed";
//         debugEvent(interfaceName+"."+signalName, value[valueKey]);
//         if (typeof valueKey == 'string' || valueKey instanceof String) {
//           switch(interfaceName) {
//             case 'org.mpris.MediaPlayer2':
//               valueToSet.emit(signalName, value[valueKey], valueToSet[valueKey]);
//               valueToSet[valueKey] = value[valueKey];
//             break;
//             case 'org.mpris.MediaPlayer2.Player':
//               valueToSet.Player.emit(signalName, value[valueKey], valueToSet.Player[valueKey]);
//               valueToSet.Player[valueKey] = value[valueKey];
//             break;
//             case 'org.mpris.MediaPlayer2.TrackList':
//               valueToSet.TrackList.emit(signalName, value[valueKey], valueToSet.TrackList[valueKey]);
//               valueToSet.TrackList[valueKey] = value[valueKey];
//             break;
//             case 'org.mpris.MediaPlayer2.Playlists':
//               valueToSet.Playlists.emit(signalName, value[valueKey], valueToSet.Playlists[valueKey]);
//               valueToSet.Playlists[valueKey] = value[valueKey];
//             break;
//           }
//         } else { // WORKAROUND if value is not sent, e.g. http://specifications.freedesktop.org/mpris-spec/latest/Track_List_Interface.html#Property:Tracks
//           switch(interfaceName) {
//             case 'org.mpris.MediaPlayer2':
//             break;
//             case 'org.mpris.MediaPlayer2.Player':
//             break;
//             case 'org.mpris.MediaPlayer2.TrackList':
//               valueToSet.TrackList.emit("TracksChanged");
//             break;
//             case 'org.mpris.MediaPlayer2.Playlists':
//             break;
//           }
//         }

//       });
//       callback(null);
//     }
//   });
// }

var integrateMethods = function (valueToSet, iface, methodKeys) {
  methodKeys.forEach(function(methodKey) {
    valueToSet[methodKey] =  function () {
      // var arguments = Array.prototype.slice.call(arguments); ?
      iface[methodKey]['timeout'] = TIMEOUTDELAY;
      if(arguments.length >=0) {
        callback = arguments[arguments.length-1];
        iface[methodKey]['finish'] = callback;
      }
      debug("Call method "+methodKey+" with arguments: ");
      debug(arguments);
      if(iface.object.method[methodKey].in.length != arguments.length) {
        warn("Wrong count of arguments!");
      }
      switch(arguments.length) {
        case 0:
          iface[methodKey]();
        break;
        case 1:
          iface[methodKey](callback);
        break;
        case 2:
          iface[methodKey](arguments[0], callback);
        break;
        case 3:
          iface[methodKey](arguments[0], arguments[1], callback);
        break;
        case 4:
          iface[methodKey](arguments[0], arguments[1], arguments[2], callback);
        break;
        case 5:
          iface[methodKey](arguments[0], arguments[1], arguments[2], arguments[3], callback);
        break;
      }
    }
  });
}

// type = "get" | "set"
var integrateProperties = function (valueToSet, iface, propertyKeys) {
  propertyKeys.forEach(function(propertyKey) {
    if(iface.object.property[propertyKey].access == 'readwrite' || iface.object.property[propertyKey].access == 'read') {
      valueToSet['Get'+propertyKey] = function (callback) {
        iface.getProperty(propertyKey, callback);
      }
    }
    if(iface.object.property[propertyKey].access == 'readwrite' || iface.object.property[propertyKey].access == 'write') {
      valueToSet['Set'+propertyKey] = function (value, callback) {
        iface.setProperty(propertyKey, value, callback);
      }
    }
  });
}

var integrateSignals = function (valueToSet, iface, signalKeys) {
  signalKeys.forEach(function(signalKey) {
    iface.on(signalKey, function(arg1, arg2, arg3, arg4, arg5) {
      debugEvent(signalKey, arg1, arg2, arg3, arg4, arg5);
      //valueToSet.emit(signalKey, arg1, arg2, arg3, arg4, arg5);
    });
  });
}

var loadInterface = function (valueToSet, serviceName, objectPath, interfaceName, callback) {
  debug("valueToSet");
  debug(valueToSet);
  bus.getInterface(serviceName, objectPath, interfaceName, function(err, iface) {
    if(err) {
      callback(err);
    } else {
      debugIface(iface);

      var methodKeys = Object.keys(iface.object.method);
      var propertyKeys = Object.keys(iface.object.property); // generate getters for all properties
      var signalKeys = Object.keys(iface.object.signal);

      /* =========== Methods ===========*/
      integrateMethods(valueToSet, iface, methodKeys);

      /* =========== Properties (getter and setter) ===========*/
      integrateProperties(valueToSet, iface, propertyKeys);

      /* =========== Signals ===========*/
      integrateSignals(valueToSet, iface, signalKeys);

      callback(null, valueToSet);
    }
  });
};

nm.disconnect = function (playerName, callback) {
  delete bus;
};

var arrayOfBytesToString = function (ArrayOfBytes) {
  var SsidString = ""; // map D-Bus type "ab" (Array of bytes) to String
  ArrayOfBytes.forEach(function(code) {
    SsidString += String.fromCharCode(code);
  });
  return SsidString;
};

nm.SsidToString = function (ssid) {
  return arrayOfBytesToString(ssid);
};

var numToDot = function (num) {
  var d = num%256;
  for (var i = 3; i > 0; i--) { 
    num = Math.floor(num/256);
    //d = num%256 + '.' + d;
    d = d + '.' + num%256;
  }
  return d;
}

// Addresses is Array of tuples of IPv4 address/prefix/gateway.
// All 3 elements of each tuple are in network byte order.
// Essentially: [(addr, prefix, gateway), (addr, prefix, gateway), ...]
// See
//   https://developer.gnome.org/NetworkManager/0.9/spec.html#org.freedesktop.NetworkManager.IP4Config
//   https://github.com/rs/node-netmask
nm.AddressTupleToIPBlock = function (AddressTuple) {
  
  var ip = numToDot(AddressTuple[0]);
  var gateway = numToDot(AddressTuple[2]);
  var bitmask = AddressTuple[1];
  var block = new Netmask(ip, bitmask);
  block.ip = ip;
  block.gateway = gateway;
  return block;
};

nm.connect = function (callback) {
  bus = dbus.getBus('system');
  nm.serviceName = 'org.freedesktop.NetworkManager';
  nm.objectPath = '/org/freedesktop/NetworkManager';

  nm.NewNetworkManager = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager';
    if(objectPath == null) {objectPath = '/org/freedesktop/NetworkManager';}
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }

  nm.NewAccessPoint = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.AccessPoint';
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }

  nm.NewDevice = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device';
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }

  nm.NewIP4Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.IP4Config';
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }

  nm.NewIP6Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.IP6Config';
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }

  nm.NewDHCP4Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.DHCP4Config';
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }

  nm.NewDHCP6Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.DHCP6Config';
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }

  nm.NewSettings = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Settings';
    if(objectPath == null) {objectPath = '/org/freedesktop/NetworkManager/Settings';}
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }

  nm.NewSettingsConnection = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Settings.Connection';
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }

  nm.NewActiveConnection = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Connection.Active';
    loadInterface(result = {}, nm.serviceName, objectPath, interfaceName, callback);
  }


  waitForService(nm.serviceName, TIMEOUTDELAY, INTERVALDELAY, function (error) {
    if(error) {
      console.error (error);
    } else {
      debug("NetworkManager DBus found! :)");
      callback(error, nm);
    }
  });
}

module.exports = nm;