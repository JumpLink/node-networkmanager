var networkmanager = require('../index.js');
var util = require('util');

var inspect = function(object) {
  console.log("\n"+util.inspect(object, showHidden=false, depth=2, colorize=true)+"\n");
}

var getAccessPointInfo = function (AccessPoint) {
  AccessPoint.GetSsid(function(error, SsidString) {
    console.log("SSID: "+SsidString);
  });

  AccessPoint.GetFlags(function(error, Flags) {
    console.log(Flags.description);
  });


  AccessPoint.GetWpaFlags(function(error, WpaFlags) {
    //inspect(WpaFlags);
    for (var i = 0; i < WpaFlags.values.length; i++) {
      console.log("WpaFlag: "+WpaFlags.values[i].description);
    };
  });

  AccessPoint.GetRsnFlags(function(error, RsnFlags) {
    //inspect(RsnFlags);
    for (var i = 0; i < RsnFlags.values.length; i++) {
      console.log("RsnFlag: "+RsnFlags.values[i].description);
    };
  });

  AccessPoint.GetMaxBitrate(function(error, MaxBitrate) {
    console.log("AccessPoint max bitrate: "+MaxBitrate+" Kb/s");
  });

  AccessPoint.GetMode(function(error, Mode) {
    console.log("AccessPoint Mode: "+Mode.description);
  });

  AccessPoint.GetStrength(function(error, Strength) {
    console.log("AccessPoint Strength: "+Strength+"%");
  });
}

var getIp4ConfigInfo = function (IP4Config) {
  IP4Config.GetDomains(function(error, Domains) {
    console.log("IPv4 Domains: "+Domains.toString());
  });

  IP4Config.GetAddresses(function(error, Addresses) {
    inspect({'IPv4 Addresses': Addresses});
  });
}

var getIp6ConfigInfo = function (IP6Config) {
  IP6Config.GetRoutes(function(error, Routes) {
    inspect({'IPv6 Routes': Routes});
  });
  IP6Config.GetDomains(function(error, Domains) {
    inspect({'IPv6 Domains': Domains});
  });
  IP6Config.GetNameservers(function(error, Nameservers) {
    inspect({'IPv6 Nameservers': Nameservers});
  });
  IP6Config.GetAddresses(function(error, Addresses) {
    inspect({'IPv6 Addresses': Addresses});
  });
}

var getDeviceInfo = function (Device) {

  Device.on('StateChanged', function (newState, oldState, reason) {
    if(newState) console.log("Device state changed: "+newState.description);
    if(reason) console.log("Device reason: "+reason.description);
  });

  Device.GetCapabilities(function(error, Capabilities) {
    console.log(Capabilities.description);
  });

  Device.GetDeviceType(function(error, DeviceType) {
    console.log(DeviceType.description);
    switch(DeviceType.name) {
      case 'ETHERNET':
        Device.GetSpeed(function(error, Speed) {
          console.log("Speed is "+Speed+" Mb/s");
        });
      break; 
      case 'WIFI':
        Device.GetWirelessCapabilities(function(error, WirelessCapabilities) {
          for (var i = 0; i < WirelessCapabilities.values.length; i++) {  
            console.log("WirelessCapabilities: "+WirelessCapabilities.values[i].description);
          };
        });

        Device.GetAccessPoints(function(error, AccessPoints) {
          // Array of visible access points
          for (var i = 0; i < AccessPoints.length; i++) {  
            getAccessPointInfo(AccessPoints[i]);
          };
        });

        Device.GetBitrate(function(error, Bitrate) {
          console.log("Wireless Device Bitrate: "+Bitrate+" Kb/s");
        });

        Device.GetMode(function(error, Mode) {
          console.log("Wireless Device Mode: "+Mode.description);
        });
      break; 
    }
  });

  Device.GetStateReason(function(error, State, Reason) {
    console.log(State.description);
    console.log(Reason.description);
  });

  Device.GetIp4Config(function(error, Ip4Config) {
    if(!error && Ip4Config != null) getIp4ConfigInfo(Ip4Config);
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
  SettingsConnection.GetSettings(function(error, Settings) {
    inspect(Settings);
    if(Settings['802-11-wireless-security']) {
      SettingsConnection.GetSecrets('802-11-wireless-security', function(Secrets) {
        inspect(Secrets); // WARNING! This print out your Wireless Key!
      });
    }
  });
}

var getActiveConnectionInfo = function (ActiveConnection) {

  ActiveConnection.GetSpecificObject(function(error, SpecificObject) {
    if(SpecificObject != null) getAccessPointInfo(SpecificObject);
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
    if(hasIPv4) console.log("The active connection use IPv4");
  });

  // check active connection currently owns the default IPv6 route
  ActiveConnection.GetDefault6(function(error, hasIPv6) {
    if(hasIPv6) console.log("The active connection use IPv6");
  });
}

networkmanager.connect(function (error, networkmanager) {

  networkmanager.NetworkManager.on('StateChanged', function(newState, oldState) {
    if(typeof oldState == 'undefined' || newState.code != oldState.code) {
      console.log("NetworkManager state changed: "+newState.description);
    }
  });

  networkmanager.NetworkManager.GetVersion(function(error, Version) {
    console.log("NetworkManager Version: "+Version);
  });

  networkmanager.NetworkManager.GetState(function(error, state) {
    console.log(state.description);
  });

  networkmanager.NetworkManager.GetPrimaryConnection(function(error, PrimaryConnection) {
    // getActiveConnectionInfo(PrimaryConnection);
  });

  // get all active connections
  networkmanager.NetworkManager.GetActiveConnections(function(error, ActiveConnections) {
    console.log("Count of active connections: "+ActiveConnections.length);
    for (var i = 0; i < ActiveConnections.length; i++) {
      getActiveConnectionInfo(ActiveConnections[i]);
    };
  });
});