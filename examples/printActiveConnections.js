var networkmanager = require('../index.js');
var util = require('util');

var inspect = function(object) {
  console.log("\n"+util.inspect(object, showHidden=false, depth=2, colorize=true)+"\n");
}

var getAccessPointInfo = function (AccessPoint) {
  AccessPoint.GetSsid(function(error, SsidString) {
    console.log("SSID: "+SsidString);
  });
}

var getIp4ConfigInfo = function (IP4Config) {
  IP4Config.GetDomains(function(error, Domains) {
    console.log("Domains: "+Domains.toString());
  });

  IP4Config.GetAddresses(function(error, Addresses) {
    inspect(Addresses);
  });
}

var getIp6ConfigInfo = function (IP6Config) {
  IP6Config.GetRoutes(function(error, Routes) {
    inspect(Routes);
  });
  IP6Config.GetDomains(function(error, Domains) {
    inspect(Domains);
  });
  IP6Config.GetNameservers(function(error, Nameservers) {
    inspect(Nameservers);
  });
  IP6Config.GetAddresses(function(error, Addresses) {
    inspect(Addresses);
  });
}

var getDeviceInfo = function (Device) {
  Device.GetIp4Config(function(error, Ip4Config) {
    getIp4ConfigInfo(Ip4Config);
  });

  Device.GetIp6Config(function(error, Ip6Config) {
    if(!error && Ip6Config != null) getIp6ConfigInfo(Ip6Config);
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
}

var getSettingsConnectionInfo = function (SettingsConnection) {
  SettingsConnection.GetSettings(function(Settings) {
    inspect(Settings);
    if(Settings['802-11-wireless-security']) {
      SettingsConnection.GetSecrets('802-11-wireless-security', function(Secrets) {
        inspect(Secrets); // WARNING! This print out your Wireless Key!
      });
    }
  });
}

var getActiveConnectionInfo = function (ActiveConnection) {

  ActiveConnection.GetAccessPoint(function(error, AccessPoint) {
    getAccessPointInfo(AccessPoint);
  });

  ActiveConnection.GetDevices(function(error, Devices) {
    for (var i = 0; i < Devices.length; i++) {  
      getDeviceInfo(Devices[i]);
    };
  });

  ActiveConnection.GetConnection(function(error, SettingsConnection) {
    getSettingsConnectionInfo(SettingsConnection);
  });

  // check active connection currently owns the default IPv4 route
  ActiveConnection.GetDefault(function(error, hasIPv4) {
    if(hasIPv4) console.log("use IPv4");
  });

  // check active connection currently owns the default IPv6 route
  ActiveConnection.GetDefault6(function(error, hasIPv6) {
    if(hasIPv6) console.log("use IPv6");
  });
}

networkmanager.connect(function (error, networkmanager) {
  networkmanager.NetworkManager.GetVersion(function(error, Version) {
    console.log("NetworkManager Version: "+Version);
  });
  networkmanager.NetworkManager.GetState(function(error, State) {
    inspect(State);
  });
  // get all active connections
  networkmanager.NetworkManager.GetActiveConnections(function(error, ActiveConnections) {
    console.log("Count of active connections: "+ActiveConnections.length);
    for (var i = 0; i < ActiveConnections.length; i++) {
      getActiveConnectionInfo(ActiveConnections[i]);
    };
  });
});