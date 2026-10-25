// Everything the site says about George lives here. Edit freely; the scene and the text version both read from it.
// An empty string renders as a visible TODO.

export type Entry = { title: string; org: string; when: string; where: string; points: string[] }
// links (optional): evidence for the project, e.g. [{ label: 'Repo', href: 'https://github.com/...' }, { label: 'Write-up', href: '/blog/slug/' }]
export type Project = { name: string; body: string; tags: string[]; featured?: boolean; links?: Link[] }
export type Link = { label: string; href: string }

export const profile = {
  name: 'George Ashinze',
  tagline: 'Cyber security · IT infrastructure · homelab',
  headline: 'Cybersecurity analyst & IT officer · Abuja, Nigeria',
  credentials: 'CompTIA Security+ · MSc Cyber Security & Penetration Testing',
  location: 'FCT-Abuja, Nigeria',
  email: 'georgemashinze@gmail.com',
  site: 'https://grushtech.com',
  about:
    'Cyber security analyst and IT officer based in Abuja, Nigeria, with an MSc in Cyber Security and Penetration Testing from Middlesex University Dubai. I work across offensive and defensive security (vulnerability assessments, phishing simulations, incident response) and run a Proxmox / OPNsense homelab with segmented VLANs.',
  certifications: ['CompTIA Security+ (2024)'],
  softSkills: ['Adaptability', 'Attention to detail', 'Collaboration', 'Communication', 'Problem-solving'],
  interests: ['Gaming', 'Golfing', 'Swimming', 'Volleyball'],
  links: [
    { label: 'GitHub', href: 'https://github.com/grush-cloud' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/george-ashinze-856a51206' },
  ] as Link[],
}

export const skills: { group: string; items: string[] }[] = [
  {
    group: 'Offensive',
    items: ['Penetration testing', 'Vulnerability assessments', 'Security audits', 'Phishing simulations', 'Social engineering assessments', 'Nessus', 'Evilginx', 'Gophish', 'OSINT tools'],
  },
  {
    group: 'Defensive',
    items: ['Incident response', 'Security hardening', 'Firewall management (pfSense, OPNsense)', 'IDS/IPS (Snort)', 'Endpoint protection', 'Security log analysis', 'Monitoring systems', 'Post-incident reporting', 'Mitigation strategies'],
  },
  {
    group: 'Infrastructure',
    items: ['VPN (WireGuard, OpenVPN)', 'Network segmentation', 'VLAN setup', 'Virtualization (Proxmox)', 'TrueNAS', 'OpenMediaVault (OMV)', 'RAID configurations', 'NAS setup (Raspberry Pi, TrueNAS)', 'Server configuration', 'VPS configuration', 'Azure (honeypot deployments)', 'Cloud services', 'Remote access security'],
  },
  {
    group: 'Engineering',
    items: ['Python', 'Git', 'Software testing', 'Debugging', 'Quality assurance', 'Secure system design', 'Documentation', 'Technical and procedural recommendations'],
  },
]

// The rack has 5 project servers. Projects with `featured: true` are racked first; any free servers go to the rest in list order.
// Everything else sits behind a "+N more projects" unit and is always listed in the Projects panel.
export const projects: Project[] = [
  {
    name: 'Home Lab',
    body: 'Designed and implemented a virtualized lab using Proxmox, OPNsense and VLANs to replicate enterprise-grade network segmentation and security. Deployed and managed automation, monitoring and media services, including Jellyfin, Tailscale and the *Arr stack, with advanced firewall configuration for performance and security.',
    tags: ['Proxmox', 'OPNsense', 'VLANs', 'Jellyfin', 'Tailscale', '*Arr stack'],
  },
  {
    name: 'VPS VPN Setup',
    body: 'Configured a VPS as a VPN server to forward traffic to a VPN client behind a CGNAT router, enabling access to self-hosted services on the local network.',
    tags: ['VPS', 'VPN', 'CGNAT'],
  },
  {
    name: 'Local NAS Setup',
    body: 'Implemented multiple Raspberry Pi-based NAS for local file storage and management.',
    tags: ['Raspberry Pi', 'NAS'],
  },
  {
    name: 'Phishing Simulation Setup',
    body: 'Conducted home-lab phishing emulation using Evilginx (lab only) to emulate credential-theft scenarios and evaluate detection and defense effectiveness.',
    tags: ['Evilginx', 'Phishing', 'Lab only'],
  },
  {
    name: 'Azure Honeypot',
    body: 'Deployed and managed a honeypot in an Azure test environment to emulate exposed services and collect attack telemetry. Analyzed intrusion patterns and attacker techniques to improve detection rules and hardening strategies.',
    tags: ['Azure', 'Honeypot', 'Detection'],
  },
]

// Newest first. The NAS has 4 bays: the latest roles fill them, and a 5th+ role turns the last bay into "+N earlier roles".
export const experience: Entry[] = [
  {
    title: 'IT Officer, Anti-Corruption and Transparency Unit',
    org: 'Nigeria Education Loan Fund',
    when: 'Sep 2024 – Present',
    where: 'FCT-Abuja, Nigeria',
    points: [
      'Orchestrated the design of IT infrastructure for the Anti-Corruption & Transparency Unit, aligned with anti-corruption objectives and scalable for future transparency initiatives.',
      'Played a key role in selecting software tools to improve workflow efficiency, in line with anti-corruption standards and data transparency initiatives.',
      'Designed secure systems for sensitive data management, implementing encryption, user authentication and cybersecurity protocols to protect against unauthorized access.',
      'Designed and configured a demo prototype for an anonymous whistleblowing system, laying the foundation for confidential reporting of corruption.',
      'Ran an organization-wide phishing simulation with the IT department by configuring GoPhish and Postfix mail servers, assessing staff cyber awareness and identifying areas for targeted training.',
    ],
  },
  {
    title: 'Freelance IT / Cybersecurity Consultant',
    org: 'Defense Intelligence Agency',
    when: 'Sep 2024 – Present',
    where: 'FCT-Abuja, Nigeria',
    points: [
      "Provide ongoing IT and cybersecurity consulting, advising on threat mitigation, security architecture improvements and risk assessment frameworks to strengthen the agency's defensive posture.",
    ],
  },
  {
    title: 'Cyber Security Analyst',
    org: 'Defense Intelligence Agency',
    when: 'Sep 2023 – Sep 2024',
    where: 'FCT-Abuja, Nigeria',
    points: [
      'Supported cyber operations across agency infrastructure, including vulnerability assessments, phishing simulations, open-source intelligence (OSINT) research and incident response.',
      'Took part in authorized red team and phishing-awareness exercises using Evilginx and Gophish to measure and improve staff resilience to phishing.',
      'Carried out OSINT research to support threat assessments, incident triage and planning.',
      'Performed vulnerability scans and security assessments with in-house tools and custom scripts to find and remediate misconfigurations and critical exposures.',
      'Helped deploy and manage security infrastructure including pfSense firewalls, Snort IDS and an in-house endpoint protection solution.',
      'Analyzed system and security logs to detect anomalies, investigate incidents and refine detection and response workflows.',
      'Configured and maintained secure local storage with TrueNAS and OpenMediaVault (OMV), using RAID for redundancy and resilience.',
      'Deployed WireGuard VPN on virtual private servers to give clients behind CGNAT encrypted remote access to internal services.',
      'Supported cyber awareness initiatives with staff training on phishing, social engineering and safe digital practices.',
      'Produced detailed post-incident reports, documented findings and recommended technical and procedural mitigations.',
    ],
  },
  {
    title: 'Software Development Intern',
    org: 'Prunedge Development Technologies',
    when: 'Jan 2023 – Nov 2023',
    where: 'FCT-Abuja, Nigeria',
    points: [
      'Assisted in developing and testing software applications, including debugging and troubleshooting.',
      'Worked with software engineering teams to design and ship features and enhancements based on user feedback, improving usability.',
      'Took part in code reviews and quality assurance processes to keep code aligned with project specifications.',
    ],
  },
]

// Newest first. 3 Pis on the shelf; extra entries turn the last Pi into "+N more".
export const education: Entry[] = [
  { title: 'MSc Cyber Security and Penetration Testing', org: 'Middlesex University', when: 'Sep 2021 – Nov 2022', where: 'Dubai, U.A.E', points: [] },
  { title: 'BSc Information Technology', org: 'Middlesex University', when: 'Jan 2021 – Sep 2021', where: 'Dubai, U.A.E', points: [] },
  { title: 'Advanced Diploma in Software Engineering', org: 'APTECH Computer Education Centre', when: 'Sep 2018 – Dec 2020', where: 'FCT-Abuja, Nigeria', points: [] },
]
