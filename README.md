node-networkmanager
===================

Controll the [NetworkManager](https://wiki.gnome.org/Projects/NetworkManager) with Node.js

# Dokumentation
 * Official D-Bus Reference Manual: https://developer.gnome.org/NetworkManager/0.9/
 * Official D-Bus Interface Specification: https://developer.gnome.org/NetworkManager/0.9/spec.html

This Dokumentation is based on the Dokumentation for the [python-networkmanager](https://pythonhosted.org/python-networkmanager/).

## Node.js API to talk to NetworkManager
NetworkManager provides a detailed and capable D-Bus interface on the system bus. You can use this interface to query NetworkManager about the overall state of the network and details of network devices like current IP addresses or DHCP options, and to activate and deactivate network connections.

node-networkmanager takes this D-Bus interface and wraps D-Bus interfaces in objects and D-Bus properties in getter and setter functions.

## The NetworkManager module
All the code is contained in one module: NetworkManager. Using it is very simple:
```
var networkmanager = require('networkmanager');
networkmanager.connect(function (error, networkmanager) {
  networkmanager.NetworkManager.GetVersion(function(error, Version) {
    console.log("NetworkManager Version: "+Version);
  });
});
```

NetworkManager exposes a lot of information via D-Bus and also allows full control of network settings. The full D-Bus API can be found on [NetworkManager project website](https://developer.gnome.org/NetworkManager/0.9/spec.html
). All interfaces listed there have been wrapped in objects as listed below. With a few exceptions, they behave exactly like the D-Bus methods. These exceptions are for convenience and limited to this list:
 * IP addresses are returned as strings of the form 1.2.3.4 instead of network byte ordered integers.
 * Route metrics are returned in host byte order, so you can use them as integers.
 * Mac addresses and BSSIDs are always returned as strings of the form 00:11:22:33:44:55 instead of byte sequences.
 * Wireless SSID’s are returned as strings instead of byte sequences.
 * Enumerated types wrapped to objects including the enumerated type index, the name and the description.
 * All D-Bus properties are exposed as getters and setters, e.g. ```NetworkManager.Version``` is wrapped to ```NetworkManager.GetVersion```
 * Callback values are automatically converted to JavaScript types (thanky to [node-dbus](https://github.com/Shouqun/node-dbus))
 * Object paths in return values are automatically replaced with proxy objects, so you don’t need to do that manually

## List of objects
TODO..
