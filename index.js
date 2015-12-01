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
var spawn = require('child_process').spawn;
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
var TIMEOUTDELAY = 10000;
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
      if(arguments.length >=0 && typeof(arguments[arguments.length-1]) == 'function') {
        var callback = arguments[arguments.length-1]; // last argument is callback
        iface[methodKey]['finish'] = function (result) {
          callback(null, result);
        }
        iface[methodKey]['error'] = function (error) {
          callback(error);
        }
      }
      debug("Call method "+methodKey+" with arguments: ");
      debug(arguments);
      // length + 1 argument for the callback
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
      //if(iface.object.method) console.log(iface.object.method);

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

// undo arrayOfBytesToString
var stringToArrayOfBytes = function (str) {
  var bytes = [];
  for (var i = 0; i < str.length; ++i) {
      bytes.push(str.charCodeAt(i));
  }
  return bytes;
};

// http://javascript.about.com/library/blipconvert.htm
var numToIP = function (num) {
  var d = num%256;
  for (var i = 3; i > 0; i--) { 
    num = Math.floor(num/256);
    d = d + '.' + num%256;
  }
  return d;
}

// undo numToIP
var ipToNum = function (dot) {
  var d = dot.split('.');
  return ((((((+d[3])*256)+(+d[2]))*256)+(+d[1]))*256)+(+d[0]);
}


// http://jsperf.com/convert-byte-array-to-hex-string
var arrayOfBytesToMac = function (byteArrayData) {
  var ret = "",
  i = 0,
  len = byteArrayData.length;
  while (i < len) {
    var h = byteArrayData[i].toString(16);
    if (h.length < 2) {
      h = "0" + h;
    }
    ret += h.toUpperCase();
    if(i+1 != len)
      ret += ":";
    i++;
  }
  return ret;
}

// undo arrayOfBytesToMac
function MacToArrayOfBytes(str) { 
  var result = [];
  var hexArray = str.split(':');
  hexArray.forEach(function(hex) {
    result.push(parseInt(hex, 16));
  });
  return result;
}

function ShortIPv6(value) {
  return value;
}

var arrayOfBytesToIPv6 = function (byteArrayData) {
  var ret = "",
  i = 0,
  len = byteArrayData.length;
  while (i < len) {
    var h = parseInt(byteArrayData[i]).toString(16);
    if (h.length < 2) {
      h = "0" + h;
    }
    ret += h;
    if(i%2 != 0 && i+1 != len) { // number odd and not last
      ret += ":";
    }
    i++;
  }
  return ShortIPv6(ret);
}

// Addresses is Array of tuples of IPv4 address/prefix/gateway.
// All 3 elements of each tuple are in network byte order.
// Essentially: [(addr, prefix, gateway), (addr, prefix, gateway), ...]
// See
//   https://developer.gnome.org/NetworkManager/0.9/spec.html#org.freedesktop.NetworkManager.IP4Config
//   https://github.com/rs/node-netmask
var AddressTupleToIPBlock = function (AddressTuple) {
  
  var ip = numToIP(AddressTuple[0]);
  var bitmask = AddressTuple[1];
  var gateway = numToIP(AddressTuple[2]);
  var block = new Netmask(ip, bitmask);
  block.ip = ip;
  block.gateway = gateway;
  return block;
};

// undo AddressTupleToIPBlock
var IPBlockToAddressTuple = function(IpBLock) {
  var ip = ipToNum(IpBLock.ip);
  var bitmask = IpBLock.bitmask;
  var gateway = ipToNum(IpBLock.gateway);
  return [ ip, bitmask, gateway ];
}

var AddressTupleToIPv6Block = function (AddressTuple) {
  var result = [];
  for(var address in AddressTuple) {
    address = address.split(',');
    result.push(arrayOfBytesToIPv6(address)+"/"+AddressTuple[address]);
  }
  return result;
};

nm.connect = function (callback) {
  bus = dbus.getBus('system');
  nm.serviceName = 'org.freedesktop.NetworkManager';
  nm.objectPath = '/org/freedesktop/NetworkManager';

  nm.NewNetworkManager = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager';
    if(objectPath == null) {objectPath = '/org/freedesktop/NetworkManager';}
    loadInterface(NetworkManager = {}, nm.serviceName, objectPath, interfaceName, function (error, NetworkManager) {

      NetworkManager.objectPath = objectPath;

      // Overwrite functions that returns an object paths, so it returns the proxy object
      if (NetworkManager.GetActiveConnections) {
        var _GetActiveConnections = NetworkManager.GetActiveConnections;
        NetworkManager.GetActiveConnections = function (callback) {
          _GetActiveConnections(function (error, ActiveConnectionPaths) {
            if(error) {
              callback(error);
            } else {
              async.map(ActiveConnectionPaths,
                function iterator(ActiveConnectionPath, callback) {
                  nm.NewActiveConnection(ActiveConnectionPath, callback);
                }, callback
              );
            }
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

      if (NetworkManager.GetPrimaryConnection) {
        var _GetPrimaryConnection = NetworkManager.GetPrimaryConnection;
        NetworkManager.GetPrimaryConnection = function (callback) {
          _GetPrimaryConnection(function (error, PrimaryConnectionPath) {
            if(error) callback(error);
            else if (PrimaryConnectionPath == '/') callback(null, null);
            else nm.NewActiveConnection(PrimaryConnectionPath, callback);
          });
        }
      }

      if (NetworkManager.GetActivatingConnection) {
        var _GetActivatingConnection = NetworkManager.GetActivatingConnection;
        NetworkManager.GetActivatingConnection = function (callback) {
          _GetActivatingConnection(function (error, ActivatingConnectionPath) {
            if(error) callback(error);
            else if (ActivatingConnectionPath == '/') callback(null, null);
            else {
              nm.NewActiveConnection(ActivatingConnectionPath, callback);
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

      AccessPoint.objectPath = objectPath;

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

      if (AccessPoint.GetFlags) {
        var _GetFlags = AccessPoint.GetFlags;
        AccessPoint.GetFlags = function (callback) {
          _GetFlags(function(error, Flags) {
            if(!error) {
              Flags = enums['NM_802_11_AP_FLAGS'](Flags);
            }
            callback(error, Flags);
          });
        }
      }

      if (AccessPoint.GetWpaFlags) {
        var _GetWpaFlags = AccessPoint.GetWpaFlags;
        AccessPoint.GetWpaFlags = function (callback) {
          _GetWpaFlags(function(error, WpaFlags) {
            if(!error) {
              WpaFlags = enums['NM_802_11_AP_SEC'](WpaFlags);
            }
            callback(error, WpaFlags);
          });
        }
      }

      if (AccessPoint.GetRsnFlags) {
        var _GetRsnFlags = AccessPoint.GetRsnFlags;
        AccessPoint.GetRsnFlags = function (callback) {
          _GetRsnFlags(function(error, RsnFlags) {
            if(!error) {
              RsnFlags = enums['NM_802_11_AP_SEC'](RsnFlags);
            }
            callback(error, RsnFlags);
          });
        }
      }

      if (AccessPoint.GetMode) {
        var _GetMode = AccessPoint.GetMode
        AccessPoint.GetMode = function (callback) {
          _GetMode(function (error, Mode) {
            Mode = enums['NM_802_11_MODE'](Mode, "access point");
            callback(error, Mode);
          });
        }
      }

      callback(error, AccessPoint);
    });
  }

  nm.NewDevice = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device';
    loadInterface(Device = {}, nm.serviceName, objectPath, interfaceName, function (error, Device) {

      Device.objectPath = objectPath;

      // Overwrite functions that returns an object paths, so it returns the proxy object
      if (Device.GetIp4Config) {
        var _GetIp4Config = Device.GetIp4Config;
        Device.GetIp4Config = function (callback) {
          _GetIp4Config(function (error, Ip4ConfigPath) {
            if(error) {
              callback(error);
            } else {
              if(Ip4ConfigPath == "/") callback(error, null);
              else nm.NewIP4Config(Ip4ConfigPath, callback);
            }
          });
        }
      }
      if (Device.GetIp6Config) {
        var _GetIp6Config = Device.GetIp6Config;
        Device.GetIp6Config = function (callback) {
          _GetIp6Config(function (error, Ip6ConfigPath) {
            if(error) {
              callback(error);
            } else {
              if(Ip6ConfigPath == "/") callback(error, null);
              else nm.NewIP6Config(Ip6ConfigPath, callback);
            }
          });
        }
      }
      if (Device.GetStateReason) {
        var _GetStateReason = Device.GetStateReason;
        Device.GetStateReason = function (callback) {
          _GetStateReason(function (error, StateReason) {
            if(error) { callback(error);}
            else {
              for (var State in StateReason) break;
              var Reason = StateReason[State];
              State = enums['NM_DEVICE_STATE'](parseInt(State));
              Reason = enums['NM_DEVICE_STATE_REASON'](parseInt(Reason));
              callback(error, State, Reason);
            }
          });
        }
      }
      if (Device.GetCapabilities) {
        var _GetCapabilities = Device.GetCapabilities;
        Device.GetCapabilities = function (callback) {
          _GetCapabilities(function (error, Capabilities) {
            if(error) { callback(error);}
            else {
              Capabilities = enums['NM_DEVICE_CAP'](Capabilities);
              callback(error, Capabilities);
            }
          });
        }
      }
      if (Device.GetDeviceType) {
        var _GetDeviceType = Device.GetDeviceType;
        Device.GetDeviceType = function (callback) {
          _GetDeviceType(function (error, DeviceType) {
            if(error) { callback(error);}
            else {
              DeviceType = enums['NM_DEVICE_TYPE'](DeviceType);
              callback(error, DeviceType);
            }
          });
        }
      }

      // Load additional device interface for device type 
      Device.GetDeviceType(function(error, Type){
        if(error) callback(error);
        else {
          var additionalInterface = null;
          switch(Type.name) {
            case 'ETHERNET':
              additionalInterface = 'NewDeviceWired';
            break;
            case 'WIFI':
              additionalInterface = 'NewDeviceWireless';
            break;
            case 'UNUSED1':
            break;
            case 'UNUSED2':
            break;
            case 'BT':
              additionalInterface = 'NewDeviceBluetooth';
            break;
            case 'OLPC_MESH':
              additionalInterface = 'NewDeviceOlpcMesh';
            break;
            case 'WIMAX':
              additionalInterface = 'NewDeviceWiMax';
            break;
            case 'MODEM':
              additionalInterface = 'NewDeviceModem';
            break;
            case 'INFINIBAND':
              additionalInterface = 'NewDeviceInfiniband';
            break;
            case 'BOND':
              additionalInterface = 'NewDeviceBond';
            break;
            case 'VLAN':
              additionalInterface = 'NewDeviceVlan';
            break;
            case 'ADSL':
              additionalInterface = 'NewDeviceAdsl';
            break;
            case 'BRIDGE':
              additionalInterface = 'NewDeviceBridge';
            break;
          }
          if(additionalInterface != null) {
            nm[additionalInterface](objectPath, function (error, AdditionalDevice){
              Device = extend(Device, AdditionalDevice);
              callback(error, Device);
            });
          } else {
            callback(error, Device);
          }
        }
      });
    });
  }

  nm.NewDeviceWired = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.Wired';
    loadInterface(DeviceWired = {}, nm.serviceName, objectPath, interfaceName, function (error, DeviceWired) {
      DeviceWired.objectPath = objectPath;
      callback(error, DeviceWired);
    });
  }

  nm.NewDeviceWireless = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.Wireless';
    loadInterface(DeviceWired = {}, nm.serviceName, objectPath, interfaceName, function (error, DeviceWireless) {

      DeviceWireless.objectPath = objectPath;

      // Overwrite functions that returns an object paths, so it returns the proxy object
      if (DeviceWireless.GetAccessPoints) {
        var _GetAccessPoints = DeviceWireless.GetAccessPoints;
        DeviceWireless.GetAccessPoints = function (callback) {
          _GetAccessPoints(function (error, AccessPointPaths) {
            if(error) {
              callback(error);
            } else {
              async.map(AccessPointPaths,
                function iterator(AccessPointPath, callback) {
                  nm.NewAccessPoint(AccessPointPath, callback);
                }, callback
              );
            }
          });
        }
      }

      if (DeviceWireless.GetWirelessCapabilities) {
        var _GetWirelessCapabilities = DeviceWireless.GetWirelessCapabilities;
        DeviceWireless.GetWirelessCapabilities = function (callback) {
          _GetWirelessCapabilities(function (error, WirelessCapabilities) {
            if(error) {
              callback(error);
            } else {
              WirelessCapabilities = enums['NM_802_11_DEVICE_CAP'](WirelessCapabilities);
              callback(error, WirelessCapabilities);
            }
          });
        }
      }

      if (DeviceWireless.GetMode) {
        var _GetMode = DeviceWireless.GetMode
        DeviceWireless.GetMode = function (callback) {
          _GetMode(function (error, Mode) {
            if(error) {
              callback(error);
            } else {
              Mode = enums['NM_802_11_MODE'](Mode, "wireless device");
              callback(error, Mode);
            }
          });
        }
      }

      callback(error, DeviceWireless);
    });
  }

  nm.NewDeviceBluetooth = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.Bluetooth';
    loadInterface(DeviceBluetooth = {}, nm.serviceName, objectPath, interfaceName, function (error, DeviceBluetooth) {
      Device.objectPath = objectPath;
      callback(error, DeviceBluetooth);
    });
  }

  nm.NewDeviceOlpcMesh = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.OlpcMesh';
    loadInterface(DeviceOlpcMesh = {}, nm.serviceName, objectPath, interfaceName, function (error, DeviceOlpcMesh) {
      Device.objectPath = objectPath;
      callback(error, DeviceOlpcMesh);
    });
  }

  nm.NewDeviceWiMax = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.WiMax';
    loadInterface(Device = {}, nm.serviceName, objectPath, interfaceName, function (error, Device) {
      Device.objectPath = objectPath;
      callback(error, Device);
    });
  }

  nm.NewDeviceModem = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.Modem';
    loadInterface(Device = {}, nm.serviceName, objectPath, interfaceName, function (error, Device) {
      Device.objectPath = objectPath;
      callback(error, Device);
    });
  }

  nm.NewDeviceInfiniband = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.Infiniband';
    loadInterface(Device = {}, nm.serviceName, objectPath, interfaceName, function (error, Device) {
      Device.objectPath = objectPath;
      callback(error, Device);
    });
  }

  nm.NewDeviceBond = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.Bond';
    loadInterface(Device = {}, nm.serviceName, objectPath, interfaceName, function (error, Device) {
      Device.objectPath = objectPath;
      callback(error, Device);
    });
  }

  nm.NewDeviceVlan = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.Vlan';
    loadInterface(Device = {}, nm.serviceName, objectPath, interfaceName, function (error, Device) {
      Device.objectPath = objectPath;
      callback(error, Device);
    });
  }

  nm.NewDeviceAdsl = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.Adsl';
    loadInterface(Device = {}, nm.serviceName, objectPath, interfaceName, function (error, Device) {
      Device.objectPath = objectPath;
      callback(error, Device);
    });
  }

  nm.NewDeviceBridge = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Device.Bridge';
    loadInterface(Device = {}, nm.serviceName, objectPath, interfaceName, function (error, Device) {
      Device.objectPath = objectPath;
      callback(error, Device);
    });
  }

  nm.NewIP4Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.IP4Config';
    loadInterface(IP4Config = {}, nm.serviceName, objectPath, interfaceName, function (error, IP4Config) {

      IP4Config.objectPath = IP4Config;

      /*
       * Overwrite IP4Config.GetAddresses function to get IP addresses as strings of the form 1.2.3.4 instead of network byte ordered integers.
       */
      if (IP4Config.GetAddresses) {
        var _GetAddresses = IP4Config.GetAddresses;
        IP4Config.GetAddresses = function (callback) {
          _GetAddresses(function (error, Addresses) {
            if(error) {
              callback(error);
            } else {
              var result = [];
              if(!error) {
                for (var i = 0; i < Addresses.length; i++) {
                  var AddressTuple = Addresses[i];
                  var IPv4 = AddressTupleToIPBlock(AddressTuple);
                  result.push(IPv4);
                };
              }
              // result.AddressTuple = Addresses;
              callback(error, result);
            }
          });
        }
      }
      if (IP4Config.GetNameservers) {
        var _GetNameservers = IP4Config.GetNameservers;
        IP4Config.GetNameservers = function (callback) {
          _GetNameservers(function (error, Nameservers) {
            var result = [];
            if(!error) {
              for (var i = 0; i < Nameservers.length; i++) {
                debug(Nameservers[i]);
                var Nameserver = numToIP(Nameservers[i]);
                result.push(Nameserver);
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

      IP6Config.objectPath = objectPath;

      if (IP6Config.GetAddresses) {
        var _GetAddresses = IP6Config.GetAddresses;
        IP6Config.GetAddresses = function (callback) {
          _GetAddresses(function (error, Addresses) {
            var result = [];
            if(!error) {
              for (var i = 0; i < Addresses.length; i++) {
                var AddressTuple = Addresses[i];
                var IPv6 = AddressTupleToIPv6Block(AddressTuple);
                result.push(IPv6);
              };
            }
            callback(error, result);
          });
        }
      }

      if (IP6Config.GetNameservers) {
        var _GetNameservers = IP6Config.GetNameservers;
        IP6Config.GetNameservers = function (callback) {
          _GetNameservers(function (error, Nameservers) {
            var result = [];
            if(!error) {
              for (var i = 0; i < Nameservers.length; i++) {
                var NameserversIPv6 = arrayOfBytesToIPv6(Nameservers[i]);
                result.push(NameserversIPv6);
              };
            }
            callback(error, result);
          });
        }
      }

      callback(error, IP6Config);
    });
  }

  nm.NewDHCP4Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.DHCP4Config';
    loadInterface(DHCP4Config = {}, nm.serviceName, objectPath, interfaceName, function (error, DHCP4Config) {

      DHCP4Config.objectPath = objectPath;

      callback(error, DHCP4Config);
    });
  }

  nm.NewDHCP6Config = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.DHCP6Config';
    loadInterface(DHCP6Config = {}, nm.serviceName, objectPath, interfaceName, function (error, DHCP6Config) {

      DHCP6Config.objectPath = objectPath;

      callback(error, DHCP6Config);
    });
  }

  nm.NewSettings = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Settings';
    if(objectPath == null) {objectPath = '/org/freedesktop/NetworkManager/Settings';}
    loadInterface(Settings = {}, nm.serviceName, objectPath, interfaceName, function (error, Settings) {

      Settings.objectPath = objectPath;

      callback(error, Settings);
    });
  }

  nm.NewSettingsConnection = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Settings.Connection';
    loadInterface(SettingsConnection = {}, nm.serviceName, objectPath, interfaceName, function (error, SettingsConnection) {

      SettingsConnection.objectPath = objectPath;

      // Overwrite functions that returns an object paths, so it returns the proxy object
      if (SettingsConnection.GetSettings) {
        var transformSettingsForHuman = function (Settings) {
          if(Settings['802-11-wireless']) {
            // Settings['802-11-wireless'].ssidBytes = Settings['802-11-wireless'].ssid;
            if(Settings['802-11-wireless'].ssid instanceof Array)
              Settings['802-11-wireless'].ssid = arrayOfBytesToString(Settings['802-11-wireless'].ssid);
            // Settings['802-11-wireless']['mac-address-bytes'] = Settings['802-11-wireless']['mac-address'];
            if(Settings['802-11-wireless'].ssid instanceof Array)
              Settings['802-11-wireless']['mac-address'] = arrayOfBytesToMac(Settings['802-11-wireless']['mac-address']);
          }
          if(Settings.ipv4) {
            var addresses = [];
            for (var i = 0; i < Settings.ipv4.addresses.length; i++) {
              var AddressTuple = Settings.ipv4.addresses[i];
              var IPv4 = AddressTupleToIPBlock(AddressTuple);
              addresses.push(IPv4);
            };
            // Settings.ipv4.AddressTuple = Settings.ipv4.addresses;
            Settings.ipv4.addresses = addresses;

            var nameservers = [];
            for (var i = 0; i < Settings.ipv4.dns.length; i++) {
              var nameserver = numToIP(Settings.ipv4.dns[i]);
              nameservers.push(nameserver);
            };
            Settings.ipv4.dns = nameservers;
          }
          return Settings;
        }
        var _GetSettings = SettingsConnection.GetSettings;
        SettingsConnection.GetSettings = function (withSecrets, callback) {
          _GetSettings(function (error, Settings) {
            if(error) {
              callback(error);
            } else {
              Settings = transformSettingsForHuman(Settings);
              if(withSecrets) {
                var hasSecrets = ['802-1x', '802-11-wireless-security', 'cdma', 'gsm', 'pppoe', 'vpn'];
                async.each(hasSecrets, function( secretKey, callback) {
                  if(Settings[secretKey]) {
                    SettingsConnection.GetSecrets(secretKey, function(error, Secrets) {
                      if(!error && Secrets) {
                        Settings = extend(true, Settings, Secrets);
                      }
                      callback(); // ignore errors
                    });
                  } else {
                    callback(); // ignore errors
                  }
                }, function(error){
                  callback(error, Settings);
                });
              } else {
                callback(null, Settings);
              }
            }
          });
        }
      }

      if (SettingsConnection.Update) {
        var transformSettingsForDBus = function (Settings) {
          if(Settings['802-11-wireless']) {
            // TODO
            if(typeof Settings['802-11-wireless'].ssid === "string")
              Settings['802-11-wireless'].ssid = stringToArrayOfBytes(Settings['802-11-wireless'].ssid);
            if(typeof Settings['802-11-wireless']['mac-address'] === "string")
              Settings['802-11-wireless']['mac-address'] = MacToArrayOfBytes(Settings['802-11-wireless']['mac-address']);
          }
          if(Settings.ipv4) {
            // Adresses
            var addresses = [];
            for (var i = 0; i < Settings.ipv4.addresses.length; i++) {
              var IPBlock = Settings.ipv4.addresses[i];
              var AddressTuple = IPBlockToAddressTuple(IPBlock);
              addresses.push(AddressTuple);
            };
            Settings.ipv4.addresses = addresses;

            // Nameservers
            var nameservers = [];
            for (var i = 0; i < Settings.ipv4.dns.length; i++) {
              var nameserver = ipToNum(Settings.ipv4.dns[i]);
              nameservers.push(nameserver);
            };
            Settings.ipv4.dns = nameservers;
          }
          return Settings;
        }

        // TODO
        // var _Update = SettingsConnection.Update;
        // SettingsConnection.Update = function (Settings, callback) {
        //   Settings = transformSettingsForDBus(Settings);
        //   _Update(Settings, function (error) {
        //     callback(error, Settings);
        //   });
        // }

        // WORKAROUND
        var updateWithPython = function (objectPath, settings, callback) {
          settingsJsonString = JSON.stringify(settings);
          var python = spawn('python', [__dirname+'/UpdateSettingsConnection.py', objectPath, settingsJsonString]);
          python.on('exit', function(code, signal) {
            callback();
          });
          python.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
          });

          python.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
          });
        }

        // WORKAROUND
        SettingsConnection.Update = function (Settings, callback) {
          Settings = transformSettingsForDBus(Settings);
          updateWithPython(objectPath, Settings, function() {
            callback(null, Settings)
          });
        }
      }

      callback(error, SettingsConnection);
    });
  }

  nm.NewActiveConnection = function (objectPath, callback) {
    var interfaceName = 'org.freedesktop.NetworkManager.Connection.Active';
    loadInterface(ActiveConnection = {}, nm.serviceName, objectPath, interfaceName, function (error, ActiveConnection) {

      ActiveConnection.objectPath = objectPath;

      // Overwrite functions that returns an object paths, so it returns the proxy object
      if (ActiveConnection.GetSpecificObject) {
        ActiveConnection.GetSpecificObjectPath = ActiveConnection.GetSpecificObject;
        ActiveConnection.GetSpecificObject = function (callback) {
          ActiveConnection.GetSpecificObjectPath(function (error, SpecificObjectPath) {
            if(error) callback(error);
            else if(SpecificObjectPath == "/") callback(null, null);
            else {
              // if SpecificObjectPath has "AccessPoint" as substring
              if(SpecificObjectPath.indexOf("AccessPoint") > -1) {
                nm.NewAccessPoint(SpecificObjectPath, callback);
              } else {
                warn('SpecificObjectPath: "'+SpecificObjectPath+'" not yet implemented, please create an issue: https://github.com/JumpLink/node-networkmanager/issues');
                callback(null, null);
              }
            }
          });
        }
      }

      if (ActiveConnection.GetDevices) {
        var _GetDevices = ActiveConnection.GetDevices;
        ActiveConnection.GetDevices = function (callback) {
          _GetDevices(function (error, DevicesPaths) {
            if(error) {
              callback(error);
            } else {
              async.map(DevicesPaths,
                function iterator(DevicesPath, callback) {
                  if(DevicesPath == "/") callback(null, null);
                  else nm.NewDevice(DevicesPath, callback);
                }, callback
              );
            }
          });
        }
      }

      if (ActiveConnection.GetConnection) {
        var _GetConnection = ActiveConnection.GetConnection;
        ActiveConnection.GetConnection = function (callback) {
          _GetConnection(function (error, SettingsConnectionPath) {
            if(error) callback(error);
            else if(SettingsConnectionPath == "/") callback(null, null);
            else nm.NewSettingsConnection(SettingsConnectionPath, callback);
          });
        }
      }

      if (ActiveConnection.GetState) {
        var _GetState = ActiveConnection.GetState;
        ActiveConnection.GetState = function (callback) {
          _GetState(function (error, State) {
            if(error) callback(error);
            else {
              State = enums['NM_ACTIVE_CONNECTION_STATE'](State);
              callback(null, State);
            }
          });
        }
      }

      callback(error, ActiveConnection);
    });
  }


  waitForService(nm.serviceName, TIMEOUTDELAY, INTERVALDELAY, function (error) {
    if (error) {
      callback(error);
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