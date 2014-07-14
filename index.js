/*
  to old dokumentation? https://wiki.gnome.org/Projects/NetworkManager/DBusInterface/LatestDBusAPI
  new doku? https://developer.gnome.org/NetworkManager/unstable/spec.html
  current? https://developer.gnome.org/NetworkManager/0.9/spec.html
  see also: https://developer.gnome.org/NetworkManager/0.9/
*/


var util = require('util');
var enums = require('./enumerations');
var extend = require('node.extend');
var async = require('async');
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

var integrateMethods = function (valueToSet, iface, methodKeys) {
  methodKeys.forEach(function(methodKey) {
    valueToSet[methodKey] =  function () {
      var arguments = Array.prototype.slice.call(arguments);
      iface[methodKey]['timeout'] = TIMEOUTDELAY;
      if(arguments.length >=0) {
        iface[methodKey]['finish'] = arguments[arguments.length-1]; // last argument is callback
      }
      debug("Call method "+methodKey+" with arguments: ");
      debug(arguments);
      // + 1 argument for the callback
      if(iface.object.method[methodKey].in.length + 1 != arguments.length) {
        warn("Wrong count of arguments! Your count of arguments is "+arguments.length+", but the count should be "+iface.object.method[methodKey].in.length+1);
      }
      iface[methodKey].apply(iface, arguments); // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply
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

var emitSignal = function (valueToSet, signalName, interfaceName, splitted, saveOldValue, valueKey, newValue, oldValue, otherValues)  {
  var debugSignalName = signalName; 
  if(splitted) {
    debugSignalName += " (PropertyChanged)";
  }
  var emitParameters = [signalName, newValue, oldValue];
  if(otherValues && otherValues.length > 0) {
    emitParameters.push.apply(emitParameters, otherValues); // https://stackoverflow.com/questions/13555652/dynamic-method-parameters
  }
  debugEvent(debugSignalName, interfaceName, newValue, oldValue, otherValues);
  valueToSet.emit.apply(valueToSet, emitParameters); // 1. arg is the signal name, 2. arg is the new value, 3. arg is the old value and the rest, for apply see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply
  if(saveOldValue) {
    valueToSet[valueKey] = newValue; // save current signal value for next time to know the old value
  }
}

var integrateSignals = function (valueToSet, iface, signalKeys) {

  if(signalKeys.length > 0) {
    var emitter = new events.EventEmitter();
    valueToSet = extend(valueToSet, emitter);
    signalKeys.forEach(function(signalKey) {
      iface.on(signalKey, function() {

        var args = Array.prototype.slice.call(arguments);
        var signalName = null;
        var splitted = false;
        var saveOldValue = true;
        var valueKey = null
        var newValue = null;
        var oldValue = null;
        var otherValues = null;

        switch(signalKey) {
          // split each property in the PropertiesChanged event to to a custom event 
          case 'PropertiesChanged':
            var splitedSignalKeys = Object.keys(args[0]);
            splitedSignalKeys.forEach(function(signalKey) {

              signalName = signalKey+"Changed";
              splitted = true;
              saveOldValue = true;
              valueKey = signalKey;
              newValue = args[0][signalKey];
              oldValue = valueToSet[signalKey];
              otherValues = null;

              switch(signalKey) {
                case 'State':
                  switch(iface.interfaceName) {
                    case 'org.freedesktop.NetworkManager':
                      newValue = enums['NM_STATE'](newValue);
                    break;
                    default:
                    break;
                  }
                break;
                default:
                break;
              }
            });
          break;
          case 'StateChanged':
            switch(iface.interfaceName) {
              case 'org.freedesktop.NetworkManager.Device':
                signalName = signalKey;
                valueKey = signalName.replace('Changed','');
                splitted = false;
                saveOldValue = false; // In this case the new value does not need to be stored because we get the old value from the officell implementation
                newValue = enums['NM_DEVICE_STATE'](args[0]);
                oldValue = enums['NM_DEVICE_STATE'](args[1]);
                otherValues = [enums['NM_DEVICE_STATE_REASON'](args[2])];
              break;
              case 'org.freedesktop.NetworkManager':
              default:
                signalName = signalKey;
                valueKey = signalName.replace('Changed','');
                splitted = false;
                saveOldValue = true;
                newValue = enums['NM_STATE'](args[0]);
                oldValue = valueToSet[valueKey];
                otherValues = null;
              break;
            }
          break;
          default:
            signalName = signalKey;
            valueKey = signalName.replace('Changed','');
            splitted = false;
            saveOldValue = true;
            newValue = args[0];
            oldValue = valueToSet[valueKey];
            otherValues = null;            
        }
        emitSignal(valueToSet, signalName, iface.interfaceName, splitted, saveOldValue, valueKey, newValue, oldValue, otherValues);
      });
    });
  }
}

var loadInterface = function (valueToSet, serviceName, objectPath, interfaceName, callback) {
  debug("valueToSet");
  debug(valueToSet);
  bus.getInterface(serviceName, objectPath, interfaceName, function(err, iface) {
    if(err) {
      callback(err);
    } else {
      debugIface(iface);

      var signalKeys = Object.keys(iface.object.signal);
      var methodKeys = Object.keys(iface.object.method);
      var propertyKeys = Object.keys(iface.object.property); // generate getters for all properties

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

var numToDot = function (num) {
  var d = num%256;
  for (var i = 3; i > 0; i--) { 
    num = Math.floor(num/256);
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
var AddressTupleToIPBlock = function (AddressTuple) {
  
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
    loadInterface(NetworkManager = {}, nm.serviceName, objectPath, interfaceName, function (error, NetworkManager) {

      // Overwrite functions that returns an object paths, so it returns the proxy object
      if (NetworkManager.GetActiveConnections) {
        var _GetActiveConnections = NetworkManager.GetActiveConnections;
        NetworkManager.GetActiveConnections = function (callback) {
          _GetActiveConnections(function (error, ActiveConnectionPaths) {
            async.map(ActiveConnectionPaths,
              function iterator(ActiveConnectionPath, callback) {
                nm.NewActiveConnection(ActiveConnectionPath, callback);
              }, callback
            );
          });
        }
      }

      if (NetworkManager.GetState) {
        var _GetState = NetworkManager.GetState;
        NetworkManager.GetState = function (callback) {
          _GetState(function (error, StateCode) {
            if(error) callback(error);
            else {
              var StateObject = enums['NM_STATE'](StateCode);
              callback(null, StateObject);
            }
          });
        }
      }

      callback(error, NetworkManager);
    });
  }

  nm.NewAccessPoint = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.AccessPoint';
    loadInterface(AccessPoint = {}, nm.serviceName, objectPath, interfaceName, function (error, AccessPoint) {

      // Overwrite AccessPoint.GetSsid function to get Wireless SSID as strings instead of byte sequences.
      if (AccessPoint.GetSsid) {
        var _GetSsid = AccessPoint.GetSsid;
        AccessPoint.GetSsid = function (callback) {
          _GetSsid(function(error, Ssid) {
            var SsidString = null;
            if(!error) {
              SsidString = arrayOfBytesToString(Ssid);
            }
            callback(error, SsidString);
          });
        }
      }

      callback(error, AccessPoint);
    });
  }

  nm.NewDevice = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device';
    loadInterface(Device = {}, nm.serviceName, objectPath, interfaceName, function (error, Device) {

      // Overwrite functions that returns an object paths, so it returns the proxy object
      if (Device.GetIp4Config) {
        var _GetIp4Config = Device.GetIp4Config;
        Device.GetIp4Config = function (callback) {
          _GetIp4Config(function (error, Ip4ConfigPath) {
            nm.NewIP4Config(Ip4ConfigPath, callback);
          });
        }
      }
      if (Device.GetIp6Config) {
        var _GetIp6Config = Device.GetIp6Config;
        Device.GetIp6Config = function (callback) {
          _GetIp6Config(function (error, Ip6ConfigPath) {
            if(Ip6ConfigPath == "/") callback(null, null)
            else nm.NewIP6Config(Ip6ConfigPath, callback);
          });
        }
      }

      callback(error, Device);
    });
  }

  nm.NewIP4Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.IP4Config';
    loadInterface(IP4Config = {}, nm.serviceName, objectPath, interfaceName, function (error, IP4Config) {

      /*
       * Overwrite IP4Config.GetAddresses function to get IP addresses as strings of the form 1.2.3.4 instead of network byte ordered integers.
       */
      if (IP4Config.GetAddresses) {
        var _GetAddresses = IP4Config.GetAddresses;
        IP4Config.GetAddresses = function (callback) {
          _GetAddresses(function (error, Addresses) {
            var result = [];
            if(!error) {
              for (var i = 0; i < Addresses.length; i++) {
                var AddressTuple = Addresses[i];
                var IPv4 = AddressTupleToIPBlock(AddressTuple);
                result.push(IPv4);
              };
            }
            callback(error, result);
          });
        }
      }
      callback(error, IP4Config);
    });
  }

  nm.NewIP6Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.IP6Config';
    loadInterface(IP6Config = {}, nm.serviceName, objectPath, interfaceName, function (error, IP6Config) {

      callback(error, IP6Config);
    });
  }

  nm.NewDHCP4Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.DHCP4Config';
    loadInterface(DHCP4Config = {}, nm.serviceName, objectPath, interfaceName, function (error, DHCP4Config) {

      callback(error, DHCP4Config);
    });
  }

  nm.NewDHCP6Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.DHCP6Config';
    loadInterface(DHCP6Config = {}, nm.serviceName, objectPath, interfaceName, function (error, DHCP6Config) {

      callback(error, DHCP6Config);
    });
  }

  nm.NewSettings = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Settings';
    if(objectPath == null) {objectPath = '/org/freedesktop/NetworkManager/Settings';}
    loadInterface(Settings = {}, nm.serviceName, objectPath, interfaceName, function (error, Settings) {

      callback(error, Settings);
    });
  }

  nm.NewSettingsConnection = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Settings.Connection';
    loadInterface(SettingsConnection = {}, nm.serviceName, objectPath, interfaceName, function (error, SettingsConnection) {

      callback(error, SettingsConnection);
    });
  }

  nm.NewActiveConnection = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Connection.Active';
    loadInterface(ActiveConnection = {}, nm.serviceName, objectPath, interfaceName, function (error, ActiveConnection) {

      // Overwrite functions that returns an object paths, so it returns the proxy object
      if (ActiveConnection.GetSpecificObject) {
        var _GetSpecificObject = ActiveConnection.GetSpecificObject;
        ActiveConnection.GetSpecificObject = function (callback) {
          _GetSpecificObject(function (error, AccessPointPath) {
            nm.NewAccessPoint(AccessPointPath, callback);
          });
        }
        // Alias
        ActiveConnection.GetAccessPoint = ActiveConnection.GetSpecificObject
      }

      if (ActiveConnection.GetDevices) {
        var _GetDevices = ActiveConnection.GetDevices;
        ActiveConnection.GetDevices = function (callback) {
          _GetDevices(function (error, DevicesPaths) {
            async.map(DevicesPaths,
              function iterator(DevicesPath, callback) {
                nm.NewDevice(DevicesPath, callback);
              }, callback
            );
          });
        }
      }

      if (ActiveConnection.GetConnection) {
        var _GetConnection = ActiveConnection.GetConnection;
        ActiveConnection.GetConnection = function (callback) {
          _GetConnection(function (error, SettingsConnectionPath) {
            nm.NewSettingsConnection(SettingsConnectionPath, callback);
          });
        }
      }

      callback(error, ActiveConnection);
    });
  }


  waitForService(nm.serviceName, TIMEOUTDELAY, INTERVALDELAY, function (error) {
    if(error) {
      console.error (error);
    } else {
      debug("NetworkManager DBus found! :)");
      nm.NewNetworkManager(null, function(error, NetworkManager) {
        nm.NetworkManager = NetworkManager;
        callback(error, nm);
      });
    }
  });
}

module.exports = nm;