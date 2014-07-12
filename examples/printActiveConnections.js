// http://cheesehead-techblog.blogspot.de/2012/09/dbus-tutorial-fun-with-network-manager.html

var nm = require('../index.js');
var util = require('util');

var inspect = function(object) {
  console.log("\n"+util.inspect(object, showHidden=false, depth=2, colorize=true)+"\n");
}

var getAccessPointInfo = function (AccessPointPath) {
  // get object of AccessPoint D-Bus Interface
  nm.NewAccessPoint(AccessPointPath, function (error, AccessPoint) {

    // get SSID of current AccessPoint
    AccessPoint.GetSsid(function(error, Ssid) {

      // Convert SSID to String
      SsidString = nm.SsidToString(Ssid);
      console.log("SSID: "+SsidString);
    });
  });
}

var getIp4ConfigInfo = function (Ip4ConfigPath) {
  // get object of Ip4Config D-Bus Interface
  nm.NewIP4Config(Ip4ConfigPath, function (error, IP4Config) {

    IP4Config.GetDomains(function(error, Domains) {
      console.log("Domains: "+Domains.toString());
    });

    IP4Config.GetAddresses(function(error, Addresses) {
      for (var i = 0; i < Addresses.length; i++) {
        var AddressTuple = Addresses[i];
        var IPv4 = nm.AddressTupleToIPBlock(AddressTuple);
        inspect(IPv4);
      };
    });
  });
}

var getIp6ConfigInfo = function (Ip6ConfigPath) {
  // get object of Ip4Config D-Bus Interface
  nm.NewIP6Config(Ip6ConfigPath, function (error, IP6Config) {
    console.log(IP6Config);
  });
}

var getDeviceInfo = function (DevicePath) {
  nm.NewDevice(DevicePath, function (error, Device) {

    Device.GetIp4Config(function(error, Ip4ConfigPath) {
      console.log("Ip4ConfigPath: "+Ip4ConfigPath);
      getIp4ConfigInfo(Ip4ConfigPath);
    });

    Device.GetIp6Config(function(error, Ip6ConfigPath) {
      console.log("Ip6ConfigPath: "+Ip6ConfigPath);
      getIp6ConfigInfo(Ip6ConfigPath);
    });

    Device.GetAutoconnect(function(error, Autoconnect) {
      console.log("Autoconnect: "+Autoconnect);
    });

    Device.GetFirmwareMissing(function(error, FirmwareMissing) {
      console.log("FirmwareMissing: "+FirmwareMissing);
    });

    Device.GetManaged(function(error, Managed) {
      console.log("Managed: "+Managed);
    });

    Device.GetDriver(function(error, Driver) {
      console.log("Driver: "+Driver);
    });

    Device.GetInterface(function(error, Interface) {
      console.log("Interface: "+Interface);
    });
  });
}

var getSettingsConnectionInfo = function (SettingsConnectionPath) {
  nm.NewSettingsConnection(SettingsConnectionPath, function (error, SettingsConnection) {
    SettingsConnection.GetSettings(function(Settings) {
      inspect(Settings);
      if(Settings['802-11-wireless-security']) {
        SettingsConnection.GetSecrets('802-11-wireless-security', function(Secrets) {
          inspect(Secrets);
        });
      }

    });
  });
}

var getActiveConnectionInfo = function (ActiveConnectionPath) {
  // get object of Connection.Active D-Bus Interface
  nm.NewActiveConnection(ActiveConnectionPath, function (error, ActiveConnection) {

    // get AccessPoint Path
    ActiveConnection.GetSpecificObject(function(error, AccessPointPath) {
      console.log("AccessPointPath: "+AccessPointPath);
      getAccessPointInfo(AccessPointPath);
    });

    // get AccessPoint Path
    ActiveConnection.GetDevices(function(error, DevicePaths) {
      for (var i = 0; i < DevicePaths.length; i++) {
        console.log("DevicePath "+DevicePaths[i]);
        getDeviceInfo(DevicePaths[i]);
      };
    });

    // get SettingsConnection Path
    ActiveConnection.GetConnection(function(error, SettingsConnectionPath) {
      console.log("SettingsConnectionPath: "+SettingsConnectionPath);
      getSettingsConnectionInfo(SettingsConnectionPath);
    });

    // check active connection currently owns the default IPv4 route
    ActiveConnection.GetDefault(function(error, hasIPv4) {
      if(hasIPv4) console.log("use IPv4");
    });

    // check active connection currently owns the default IPv6 route
    ActiveConnection.GetDefault6(function(error, hasIPv6) {
      if(hasIPv6) console.log("use IPv6");
    });

  });
}

nm.connect(function (error, nm) {
  // get object of NetworkManager D-Bus Interface
  nm.NewNetworkManager(null, function(error, NetworkManager) {

    // get all active connections
    NetworkManager.GetActiveConnections(function(error, ActiveConnectionPaths) {
      for (var i = 0; i < ActiveConnectionPaths.length; i++) {
        console.log("ActiveConnectionPath: "+ActiveConnectionPaths[i]);
        getActiveConnectionInfo(ActiveConnectionPaths[i]);
      };
    });
  });
});