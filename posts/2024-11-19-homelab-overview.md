# Homelab Overview

This is an overview of my homelab, the first one I've built. I've been working on it for 3 months now.

[![Homelab network diagram: internet to the OPNsense firewall, TP-Link switch, and the Proxmox host's VLANs](/blog/homelab.jpg)](/blog/homelab-full.jpg)

[Click for the full-size diagram](/blog/homelab-full.jpg)

## Hardware Specifications

- Dell Optiplex 3070
- 32GB RAM
- Intel Core i5-9500
- Intel 82576 2-Port 1Gb NIC
- TP-Link TL-SG108E

## Details

My homelab is designed to serve as both a learning environment and a functional network for daily use. At the core of the setup is a Dell Optiplex 3070, running Proxmox as the hypervisor to host multiple virtual machines (VMs) and Linux containers (LXC). To ensure proper network segmentation and security, I've configured an OPNsense VM as the main firewall, with its dual NIC passed through for WAN and LAN connections.

The TP-Link TL-SG108E smart switch enables VLAN segmentation, allowing me to separate different types of traffic across VLANs. This setup helps in organizing services, maintaining security, and limiting unnecessary communication between devices.

The homelab is divided into specific VLANs for management, trusted services, WAN-exposed services, media automation, and experimental environments. This structure ensures that every service has a dedicated, secure space in the network while enabling controlled interaction where necessary.

Overall, my homelab is a combination of networking, automation, and media solutions. It serves as a sandbox to explore new technologies while supporting real-world applications like media hosting and remote access.

## Network Segmentation

- WAN
- LAN (Management)
- VLAN 10 (Trusted)
- VLAN 20 (WAN-Exposed Services)
- VLAN 30 (Media)
- VLAN 40 (Untrusted)

### WAN

One of the interfaces on the dual NIC is passed through to the OPNsense VM and connected to my home router. I'm not using bridge mode because I want my home network to remain independent of my homelab.

### LAN (Management Interface)

On the default (untagged) network:

- OPNsense GUI
- TP-Link switch GUI
- Proxmox GUI
- Laptop

The second interface on the dual NIC is passed through to OPNsense and serves as the management interface. This interface provides access to the OPNsense GUI, Proxmox GUI, and TP-Link switch GUI. My laptop connects to the LAN ports on the switch to access these management interfaces.

### VLAN 10 (Trusted)

This VLAN hosts **trusted services** that are allowed to communicate with other VLANs.

- **AdGuard**: Acts as the DNS server for all services and devices in my homelab.
- **Tailscale Subnet Router**: Provides secure remote access to my homelab from anywhere.

### VLAN 20 (WAN-Exposed Services)

This VLAN contains **services exposed to WAN traffic**, with necessary port forwarding configured.

- **Jellyfin & Jellyseerr**: Media servers accessible from the internet, basically my personal "Netflix".
- **Nginx Proxy Manager**: Manages reverse proxy and SSL certificates for exposed services.
- **qBittorrent**: Requires port forwarding for optimal torrenting speeds.

### VLAN 30 (Media)

This VLAN hosts my *Arr stack, which automates media management for Jellyfin.

- **Sonarr**: For TV series (includes a separate instance for anime).
- **Radarr**: For movies (includes a separate instance for anime).
- **Bazarr**: For subtitles (includes a separate instance for the anime content).
- **Prowlarr**: Indexer manager for the stack.
- **FlareSolverr**: Handles Cloudflare challenges for automation.

These tools streamline media organization, making Jellyfin seamless and easy to use.

### VLAN 40 (Untrusted)

Currently, this VLAN does not host any services or devices. The plan is to use it for VMs dedicated to experiments, such as malware testing or other isolated activities. This VLAN will be fully segregated from the rest of the network to ensure maximum security and prevent any potential risks from affecting trusted systems.

That's a brief overview of my homelab. Thanks for reading!

`Homelab` `Proxmox` `OPNsense` `Arr-stack`
