#!/usr/bin/env python
# -*- Mode: Python; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
#

#
# The MIT License (MIT)
# 
# Copyright (c) 2014 Pascal Garber
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
#

#
# This example updates a connection's IPv4 method with the Update() method.
#
# Configuration settings are described at
# https://developer.gnome.org/NetworkManager/0.9/ref-settings.html
#

#
# Example Settings
#
# dbus.Dictionary({
#   dbus.String(u'802-3-ethernet'): dbus.Dictionary({
#       dbus.String(u'duplex'): dbus.String(u'full', variant_level=1),
#       dbus.String(u's390-options'): dbus.Dictionary(
#         {}, signature=dbus.Signature('ss'), variant_level=1)
#   }, signature=dbus.Signature('sv')),
#   dbus.String(u'connection'): dbus.Dictionary({
#     dbus.String(u'timestamp'): dbus.UInt64(1406541002L, variant_level=1),
#     dbus.String(u'type'): dbus.String(u'802-3-ethernet', variant_level=1),
#     dbus.String(u'id'): dbus.String(u'Bugwelder', variant_level=1),
#     dbus.String(u'uuid'): dbus.String(u'ed23c3bc-63a9-408c-826f-c1318f61088b', variant_level=1)
#   }, signature=dbus.Signature('sv')),
#   dbus.String(u'ipv4'): dbus.Dictionary({
#         dbus.String(u'routes'): dbus.Array([], signature=dbus.Signature('au'), variant_level=1),
#         dbus.String(u'addresses'): dbus.Array([
#           dbus.Array([
#             dbus.UInt32(364030144L),
#             dbus.UInt32(24L),
#             dbus.UInt32(28485824L)
#           ], signature=dbus.Signature('u')
#         )], signature=dbus.Signature('au'), variant_level=1),
#         dbus.String(u'dns'): dbus.Array([], signature=dbus.Signature('u'), variant_level=1),
#         dbus.String(u'method'): dbus.String(u'manual', variant_level=1)
#   }, signature=dbus.Signature('sv'))
# }, signature=dbus.Signature('sa{sv}'))
#
# dbus.Dictionary({
#     dbus.String(u'802-11-wireless'): dbus.Dictionary({
#         dbus.String(u'seen-bssids'): dbus.Array([
#             dbus.String(u'A0:F3:C1:48:D7:3E')
#         ], signature=dbus.Signature('s'), variant_level=1),
#         dbus.String(u'ssid'): dbus.Array([
#             dbus.Byte(104), dbus.Byte(97), dbus.Byte(109), dbus.Byte(98), dbus.Byte(117), dbus.Byte(114), dbus.Byte(103), dbus.Byte(46), dbus.Byte(102), dbus.Byte(114), dbus.Byte(101), dbus.Byte(105), dbus.Byte(102), dbus.Byte(117), dbus.Byte(110), dbus.Byte(107), dbus.Byte(46), dbus.Byte(110), dbus.Byte(101), dbus.Byte(116)
#         ], signature=dbus.Signature('y'), variant_level=1),
#         dbus.String(u'mac-address'): dbus.Array([
#             dbus.Byte(120), dbus.Byte(146), dbus.Byte(156), dbus.Byte(9), dbus.Byte(247), dbus.Byte(250)
#         ], signature=dbus.Signature('y'), variant_level=1),
#         dbus.String(u'mode'): dbus.String(u'infrastructure', variant_level=1)
#     }, signature=dbus.Signature('sv')),
#     dbus.String(u'connection'): dbus.Dictionary({
#         dbus.String(u'timestamp'): dbus.UInt64(1406576722L, variant_level=1),
#         dbus.String(u'type'): dbus.String(u'802-11-wireless', variant_level=1),
#         dbus.String(u'id'): dbus.String(u'hamburg.freifunk.net', variant_level=1),
#         dbus.String(u'uuid'): dbus.String(u'00245195-e827-425b-b8cc-0157797f71c6', variant_level=1)
#     }, signature=dbus.Signature('sv')),
#     dbus.String(u'ipv4'): dbus.Dictionary({
#         dbus.String(u'routes'): dbus.Array([], signature=dbus.Signature('au'), variant_level=1),
#         dbus.String(u'addresses'): dbus.Array([], signature=dbus.Signature('au'), variant_level=1),
#         dbus.String(u'dns'): dbus.Array([], signature=dbus.Signature('u'), variant_level=1),
#         dbus.String(u'method'): dbus.String(u'auto', variant_level=1)}, signature=dbus.Signature('sv')),
#     dbus.String(u'ipv6'): dbus.Dictionary({
#         dbus.String(u'routes'): dbus.Array([], signature=dbus.Signature('(ayuayu)'), variant_level=1),
#         dbus.String(u'addresses'): dbus.Array([], signature=dbus.Signature('(ayuay)'), variant_level=1),
#         dbus.String(u'dns'): dbus.Array([], signature=dbus.Signature('ay'), variant_level=1),
#         dbus.String(u'method'): dbus.String(u'auto', variant_level=1)
#     }, signature=dbus.Signature('sv'))
# }, signature=dbus.Signature('sa{sv}'))
#


import socket, struct, dbus, sys, json

if len(sys.argv) < 3:
    print "Usage: %s <objectPath> <json>" % sys.argv[0]
    sys.exit(1)

def warning(message):
    sys.stderr.write("WARNING: %s\n" % message)

def parse_array_of_string(array):
  dbus_array = dbus.Array([], signature=dbus.Signature('s'), variant_level=1)
  for string_val in array:
    dbus_array.append(dbus.String(string_val))
  return dbus_array

def parse_array_of_byte(array):
  dbus_array = dbus.Array([], signature=dbus.Signature('y'), variant_level=1)
  for byte_val in array:
    dbus_array.append(dbus.Byte(byte_val))
  return dbus_array

def parse_array_of_uint32(array):
  dbus_array = dbus.Array([], signature=dbus.Signature('u'))
  for uint32val in array:
    dbus_array.append(dbus.UInt32(uint32val))
  return dbus_array

def parse_array_of_array_of_uint32(array):
  dbus_array_of_array = dbus.Array([], signature=dbus.Signature('au'), variant_level=1)
  for val in array:
    dbus_array_of_array.append(parse_array_of_uint32(val))
  return dbus_array_of_array


def parse_settings(settings):

  # ethernet = getattr(settings, '802-3-ethernet', None)
  # if ethernet is not None:
  #   # print(settings['802-3-ethernet'])
  #   print(ethernet)
  dbus_settings = dbus.Dictionary({}, signature=dbus.Signature('sa{sv}'))

  for settings_key in settings:

    if settings_key == '802-11-wireless':
      dbus_wireless = dbus.Dictionary({}, signature=dbus.Signature('sv'), variant_level=1);

      for wireless_key in settings[settings_key]:
        if wireless_key == 'seen-bssids':
          dbus_wireless[dbus.String(wireless_key)] = parse_array_of_string(settings[settings_key][wireless_key]);
        elif wireless_key == 'ssid':
          dbus_wireless[dbus.String(wireless_key)] = parse_array_of_byte(settings[settings_key][wireless_key]);
        elif wireless_key == 'mac-address':
          dbus_wireless[dbus.String(wireless_key)] = parse_array_of_byte(settings[settings_key][wireless_key]);
        elif wireless_key == 'mode':
          dbus_wireless[dbus.String(wireless_key)] = dbus.String(settings[settings_key][wireless_key], variant_level=1)
        elif wireless_key == 'security':
          dbus_wireless[dbus.String(wireless_key)] = dbus.String(settings[settings_key][wireless_key], variant_level=1)
        else:
          warning('802-11-wireless property %s not supported yet!' % wireless_key)
      
      dbus_settings[dbus.String(settings_key)] = dbus_wireless;

    elif settings_key == '802-3-ethernet':
      dbus_ethernet = dbus.Dictionary({}, signature=dbus.Signature('sv'), variant_level=1);

      for ethernet_key in settings[settings_key]:
        if ethernet_key == 'duplex': 
          dbus_ethernet[dbus.String(ethernet_key)] = dbus.String(settings[settings_key][ethernet_key], variant_level=1);
        elif ethernet_key == 's390-options':
          warning('%s property %s not supported yet!' % (settings_key, ethernet_key))
        else:
          warning('%s property %s not supported yet!' % (settings_key, ethernet_key))

      dbus_settings[dbus.String(settings_key)] = dbus_ethernet;

    elif settings_key == 'connection':
      dbus_connection = dbus.Dictionary({}, signature=dbus.Signature('sv'));

      for connection_key in settings[settings_key]:

        if connection_key == 'timestamp':
          dbus_connection[dbus.String(connection_key)] = dbus.UInt64(settings[settings_key][connection_key], variant_level=1)
        elif connection_key == 'type':
          dbus_connection[dbus.String(connection_key)] = dbus.String(settings[settings_key][connection_key], variant_level=1)
        elif connection_key == 'id':
          dbus_connection[dbus.String(connection_key)] = dbus.String(settings[settings_key][connection_key], variant_level=1)
        elif connection_key == 'uuid':
          dbus_connection[dbus.String(connection_key)] = dbus.String(settings[settings_key][connection_key], variant_level=1)
        else:
          warning('%s property %s not supported yet!' % (settings_key, connection_key))

      dbus_settings[dbus.String(settings_key)] = dbus_connection

    elif settings_key == '802-11-wireless-security':
      dbus_security = dbus.Dictionary({}, signature=dbus.Signature('sv'))
      for security_key in settings[settings_key]:
        if security_key == 'key-mgmt':
          dbus_security[dbus.String(security_key)] = dbus.String(settings[settings_key][security_key], variant_level=1)
        elif security_key == 'auth-alg':
          dbus_security[dbus.String(security_key)] = dbus.String(settings[settings_key][security_key], variant_level=1)
        elif security_key == 'psk':
          dbus_security[dbus.String(security_key)] = dbus.String(settings[settings_key][security_key], variant_level=1)
        else:
          warning('%s property %s not supported yet!' % (settings_key, security_key))
      dbus_settings[dbus.String(settings_key)] = dbus_security

    elif settings_key == 'ipv4':
      dbus_ipv4 = dbus.Dictionary({}, signature=dbus.Signature('sv'))

      for ipv4_key in settings[settings_key]:
        if ipv4_key == 'routes':
          dbus_ipv4[dbus.String(ipv4_key)] = parse_array_of_array_of_uint32(settings[settings_key][ipv4_key])
        elif ipv4_key == 'addresses':
          dbus_ipv4[dbus.String(ipv4_key)] = parse_array_of_array_of_uint32(settings[settings_key][ipv4_key])
        elif ipv4_key == 'dns':
          dbus_ipv4[dbus.String(ipv4_key)] = parse_array_of_uint32(settings[settings_key][ipv4_key])
        elif ipv4_key == 'method':
          dbus_ipv4[dbus.String(ipv4_key)] = dbus.String(settings[settings_key][ipv4_key], variant_level=1)
        else:
          warning('%s property %s not supported yet!' % (settings_key, ipv4_key))

      dbus_settings[dbus.String(settings_key)] = dbus_ipv4;

    elif settings_key == 'ipv6':
      warning('ipv6 settings not supported yet!')
    else:
      warning('%s settings not supported yet!' % settings_key)

  return dbus_settings

objectPath = sys.argv[1]
settings = json.loads(sys.argv[2])

# print(settings)
dbus_settings = parse_settings(settings)
# print(dbus_settings)


bus = dbus.SystemBus()
proxy = bus.get_object("org.freedesktop.NetworkManager", objectPath)
SettingsConnection = dbus.Interface(proxy, "org.freedesktop.NetworkManager.Settings.Connection")

# old_settings = SettingsConnection.GetSettings()
# print("\nold settings: ")
# print(old_settings)

# Save all the updated settings back to NetworkManager
SettingsConnection.Update(dbus_settings)

sys.exit(0)