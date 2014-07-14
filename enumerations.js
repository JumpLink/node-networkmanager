module.exports = {
  'NM_STATE': function (code) {
    var result = {
      code: code,
      name: 'UNKNOWN',
      description: 'Networking state is unknown.'
    };
    switch(code) {
      case 10:
        result.name = 'ASLEEP';
        result.description = 'Networking is inactive and all devices are disabled.';
      break;
      case 20:
        result.name = 'DISCONNECTED';
        result.description = 'There is no active network connection.';
      break;
      case 30:
        result.name = 'DISCONNECTING';
        result.description = 'Network connections are being cleaned up.';
      break;
      case 40:
        result.name = 'CONNECTING';
        result.description = 'A network device is connecting to a network and there is no other available network connection.';
      break;
      case 50:
        result.name = 'CONNECTED_LOCAL';
        result.description = 'A network device is connected, but there is only link-local connectivity.';
      break;
      case 60:
        result.name = 'CONNECTED_SITE';
        result.description = 'A network device is connected, but there is only site-local connectivity.';
      break;
      case 70:
        result.name = 'CONNECTED_GLOBAL';
        result.description = 'A network device is connected, with global network connectivity.';
      break;
    }
    return result;
  },
  'NM_DEVICE_STATE': function (code) {
    var result = {
      code: code,
      name: 'UNKNOWN',
      description: 'The device is in an unknown state.'
    };
    switch(code) {
      case 10:
        result.name = 'UNMANAGED';
        result.description = 'The device is recognized but not managed by NetworkManager.';
      break;
      case 20:
        result.name = 'UNAVAILABLE';
        result.description = 'The device cannot be used (carrier off, rfkill, etc).';
      break;
      case 30:
        result.name = 'DISCONNECTED';
        result.description = 'The device is not connected.';
      break;
      case 40:
        result.name = 'PREPARE';
        result.description = 'The device is preparing to connect.';
      break;
      case 50:
        result.name = 'CONFIG';
        result.description = 'The device is being configured.';
      break;
      case 60:
        result.name = 'NEED_AUTH';
        result.description = 'The device is awaiting secrets necessary to continue connection.';
      break;
      case 70:
        result.name = 'IP_CONFIG';
        result.description = 'The IP settings of the device are being requested and configured.';
      break;
      case 80:
        result.name = 'IP_CHECK';
        result.description = "The device's IP connectivity ability is being determined.";
      break;
      case 90:
        result.name = 'SECONDARIES';
        result.description = 'The device is waiting for secondary connections to be activated.';
      break;
      case 100:
        result.name = 'ACTIVATED';
        result.description = 'The device is active.';
      break;
      case 110:
        result.name = 'DEACTIVATING';
        result.description = "The device's network connection is being torn down.";
      break;
      case 120:
        result.name = 'FAILED';
        result.description = 'The device is in a failure state following an attempt to activate it.';
      break;
    }
    return result;
  },
  'NM_DEVICE_STATE_REASON': function (code) {
    var result = {
      code: code,
      name: 'UNKNOWN',
      description: 'The reason for the device state change is unknown.'
    };
    switch(code) {
      case 1:
        result.name = 'NONE';
        result.description = 'The state change is normal.';
      break;
      case 2:
        result.name = 'NOW_MANAGED';
        result.description = 'The device is now managed.';
      break;
      case 3:
        result.name = 'UNMANAGED';
        result.description = 'The device is no longer managed.';
      break;
      case 4:
        result.name = 'CONFIG_FAILED';
        result.description = 'The device could not be readied for configuration.';
      break;
      case 5:
        result.name = 'CONFIG_UNAVAILABLE';
        result.description = 'IP configuration could not be reserved (no available address, timeout, etc).';
      break;
      case 6:
        result.name = 'CONFIG_EXPIRED';
        result.description = 'The IP configuration is no longer valid.';
      break;
      case 7:
        result.name = 'NO_SECRETS';
        result.description = 'Secrets were required, but not provided.';
      break;
      case 8:
        result.name = 'SUPPLICANT_DISCONNECT';
        result.description = "The 802.1X supplicant disconnected from the access point or authentication server.";
      break;
      case 9:
        result.name = 'SUPPLICANT_CONFIG_FAILED';
        result.description = 'Configuration of the 802.1X supplicant failed.';
      break;
      case 10:
        result.name = 'SUPPLICANT_FAILED';
        result.description = 'The 802.1X supplicant quit or failed unexpectedly.';
      break;
      case 11:
        result.name = 'SUPPLICANT_TIMEOUT';
        result.description = "The 802.1X supplicant took too long to authenticate.";
      break;
      case 12:
        result.name = 'PPP_START_FAILED';
        result.description = 'The PPP service failed to start within the allowed time.';
      break;
      case 13:
        result.name = 'PPP_DISCONNECT';
        result.description = 'The PPP service disconnected unexpectedly.';
      break;
      case 14:
        result.name = 'PPP_FAILED';
        result.description = 'The PPP service quit or failed unexpectedly.';
      break;
      case 15:
        result.name = 'DHCP_START_FAILED';
        result.description = 'The DHCP service failed to start within the allowed time.';
      break;
      case 16:
        result.name = 'DHCP_ERROR';
        result.description = 'The DHCP service reported an unexpected error.';
      break;
      case 17:
        result.name = 'DHCP_FAILED';
        result.description = 'The DHCP service quit or failed unexpectedly.';
      break;
      case 18:
        result.name = 'SHARED_START_FAILED';
        result.description = 'The shared connection service failed to start.';
      break;
      case 19:
        result.name = 'SHARED_FAILED';
        result.description = 'The shared connection service quit or failed unexpectedly.';
      break;
      case 20:
        result.name = 'AUTOIP_START_FAILED';
        result.description = 'The AutoIP service failed to start.';
      break;
      case 21:
        result.name = 'AUTOIP_ERROR';
        result.description = 'The AutoIP service reported an unexpected error.';
      break;
      case 22:
        result.name = 'AUTOIP_FAILED';
        result.description = 'The AutoIP service quit or failed unexpectedly.';
      break;
      case 23:
        result.name = 'MODEM_BUSY';
        result.description = 'Dialing failed because the line was busy.';
      break;
      case 24:
        result.name = 'MODEM_NO_DIAL_TONE';
        result.description = 'Dialing failed because there was no dial tone.';
      break;
      case 25:
        result.name = 'MODEM_NO_CARRIER';
        result.description = 'Dialing failed because there was carrier.';
      break;
      case 26:
        result.name = 'MODEM_DIAL_TIMEOUT';
        result.description = 'Dialing timed out.';
      break;
      case 27:
        result.name = 'MODEM_DIAL_FAILED';
        result.description = 'Dialing failed.';
      break;
      case 28:
        result.name = 'MODEM_INIT_FAILED';
        result.description = 'Modem initialization failed.';
      break;
      case 29:
        result.name = 'GSM_APN_FAILED';
        result.description = 'Failed to select the specified GSM APN.';
      break;
      case 30:
        result.name = 'GSM_REGISTRATION_NOT_SEARCHING';
        result.description = 'Not searching for networks.';
      break;
      case 31:
        result.name = 'GSM_REGISTRATION_DENIED';
        result.description = 'Network registration was denied.';
      break;
      case 32:
        result.name = 'GSM_REGISTRATION_TIMEOUT';
        result.description = 'Network registration timed out.';
      break;
      case 33:
        result.name = 'GSM_REGISTRATION_FAILED';
        result.description = 'Failed to register with the requested GSM network.';
      break;
      case 34:
        result.name = 'GSM_PIN_CHECK_FAILED';
        result.description = 'PIN check failed.';
      break;
      case 35:
        result.name = 'FIRMWARE_MISSING';
        result.description = 'Necessary firmware for the device may be missing.';
      break;
      case 36:
        result.name = 'REMOVED';
        result.description = 'The device was removed.';
      break;
      case 37:
        result.name = 'SLEEPING';
        result.description = 'NetworkManager went to sleep.';
      break;
      case 38:
        result.name = 'CONNECTION_REMOVED';
        result.description = "The device's active connection was removed or disappeared.";
      break;
      case 39:
        result.name = 'USER_REQUESTED';
        result.description = 'A user or client requested the disconnection.';
      break;
      case 40:
        result.name = 'CARRIER';
        result.description = "The device's carrier/link changed.";
      break;
      case 41:
        result.name = 'CONNECTION_ASSUMED';
        result.description = "The device's existing connection was assumed.";
      break;
      case 42:
        result.name = 'SUPPLICANT_AVAILABLE';
        result.description = 'The 802.1x supplicant is now available.';
      break;
      case 43:
        result.name = 'MODEM_NOT_FOUND';
        result.description = 'The modem could not be found.';
      break;
      case 44:
        result.name = 'BT_FAILED';
        result.description = 'The Bluetooth connection timed out or failed.';
      break;
      case 45:
        result.name = 'GSM_SIM_NOT_INSERTED';
        result.description = "GSM Modem's SIM Card not inserted.";
      break;
      case 46:
        result.name = 'GSM_SIM_PIN_REQUIRED';
        result.description = "GSM Modem's SIM Pin required.";
      break;
      case 47:
        result.name = 'GSM_SIM_PUK_REQUIRED';
        result.description = "GSM Modem's SIM Puk required.";
      break;
      case 48:
        result.name = 'GSM_SIM_WRONG';
        result.description = "GSM Modem's SIM wrong";
      break;
      case 49:
        result.name = 'INFINIBAND_MODE';
        result.description = 'InfiniBand device does not support connected mode.';
      break;
      case 50:
        result.name = 'DEPENDENCY_FAILED';
        result.description = 'A dependency of the connection failed.';
      break;
      case 51:
        result.name = 'BR2684_FAILED';
        result.description = 'Problem with the RFC 2684 Ethernet over ADSL bridge.';
      break;
      case 52:
        result.name = 'MODEM_MANAGER_UNAVAILABLE';
        result.description = 'ModemManager was not running or quit unexpectedly.';
      break;
      case 53:
        result.name = 'SSID_NOT_FOUND';
        result.description = 'The 802.11 Wi-Fi network could not be found.';
      break;
      case 54:
        result.name = 'SECONDARY_CONNECTION_FAILED';
        result.description = 'A secondary connection of the base connection failed.';
      break;
    }
    return result;
  },
};