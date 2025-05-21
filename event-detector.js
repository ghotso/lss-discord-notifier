// Event Detection Module
class EventDetector {
    constructor() {
        this.observers = new Map();
        this.lastMissionCount = 0;
        this.knownMissions = new Set();
    }

    init() {
        this.setupMissionObserver();
        this.setupSpeakingRequestObserver();
        this.setupVehicleObserver();
    }

    setupMissionObserver() {
        // Observe the mission list container for changes
        const missionListObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    this.checkNewMissions();
                    this.checkMissionChanges();
                }
            });
        });

        const missionList = document.querySelector('#mission_list');
        if (missionList) {
            missionListObserver.observe(missionList, {
                childList: true,
                subtree: true
            });
        }
    }

    setupSpeakingRequestObserver() {
        // Observe for speaking request indicators
        const speakingRequestObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    this.checkSpeakingRequests();
                }
            });
        });

        const vehicleList = document.querySelector('#vehicle_list');
        if (vehicleList) {
            speakingRequestObserver.observe(vehicleList, {
                childList: true,
                subtree: true
            });
        }
    }

    setupVehicleObserver() {
        // Observe vehicle status changes
        const vehicleObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    this.checkIncompleteMissions();
                    this.checkSpecialRequirements();
                }
            });
        });

        const vehicleList = document.querySelector('#vehicle_list');
        if (vehicleList) {
            vehicleObserver.observe(vehicleList, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'data-status']
            });
        }
    }

    checkNewMissions() {
        const missions = document.querySelectorAll('.mission');
        const currentCount = missions.length;

        if (currentCount > this.lastMissionCount) {
            missions.forEach(mission => {
                const missionId = mission.getAttribute('data-mission-id');
                if (!this.knownMissions.has(missionId)) {
                    this.knownMissions.add(missionId);
                    this.notifyEvent(EVENT_CATEGORIES.NEW_MISSIONS, {
                        title: 'New Mission',
                        description: this.getMissionDetails(mission),
                        url: this.getMissionUrl(mission)
                    });
                }
            });
        }

        this.lastMissionCount = currentCount;
    }

    checkMissionChanges() {
        const missions = document.querySelectorAll('.mission');
        missions.forEach(mission => {
            const missionId = mission.getAttribute('data-mission-id');
            const status = mission.getAttribute('data-status');
            
            if (this.knownMissions.has(missionId)) {
                // Check for additional vehicle requests
                const additionalVehicles = mission.querySelector('.additional-vehicles');
                if (additionalVehicles) {
                    this.notifyEvent(EVENT_CATEGORIES.MISSION_CHANGED, {
                        title: 'Mission Changed',
                        description: `Additional vehicles requested: ${additionalVehicles.textContent}`,
                        url: this.getMissionUrl(mission)
                    });
                }

                // Check for large missions
                if (this.isLargeMission(mission)) {
                    this.notifyEvent(EVENT_CATEGORIES.LARGE_MISSIONS, {
                        title: 'Large Mission',
                        description: this.getMissionDetails(mission),
                        url: this.getMissionUrl(mission)
                    });
                }
            }
        });
    }

    checkSpeakingRequests() {
        const speakingVehicles = document.querySelectorAll('.vehicle.speaking-request');
        speakingVehicles.forEach(vehicle => {
            this.notifyEvent(EVENT_CATEGORIES.SPEAKING_REQUESTS, {
                title: 'Speaking Request',
                description: `Vehicle ${vehicle.getAttribute('data-vehicle-name')} needs instructions`,
                url: this.getVehicleUrl(vehicle)
            });
        });
    }

    checkIncompleteMissions() {
        const missions = document.querySelectorAll('.mission.incomplete');
        missions.forEach(mission => {
            const requiredVehicles = mission.querySelector('.required-vehicles');
            const enRouteVehicles = mission.querySelector('.en-route-vehicles');
            
            if (requiredVehicles && enRouteVehicles && 
                requiredVehicles.textContent !== enRouteVehicles.textContent) {
                this.notifyEvent(EVENT_CATEGORIES.INCOMPLETE_MISSIONS, {
                    title: 'Incomplete Mission',
                    description: `Missing vehicles: ${this.getMissingVehicles(mission)}`,
                    url: this.getMissionUrl(mission)
                });
            }
        });
    }

    checkSpecialRequirements() {
        const missions = document.querySelectorAll('.mission');
        missions.forEach(mission => {
            const specialRequirements = this.getSpecialRequirements(mission);
            if (specialRequirements.length > 0) {
                this.notifyEvent(EVENT_CATEGORIES.PATIENT_NEEDS_SPECIAL, {
                    title: 'Special Requirements',
                    description: `Required: ${specialRequirements.join(', ')}`,
                    url: this.getMissionUrl(mission)
                });
            }
        });
    }

    getMissionDetails(mission) {
        const title = mission.querySelector('.mission-title')?.textContent || 'Unknown Mission';
        const address = mission.querySelector('.mission-address')?.textContent || 'No address';
        return `${title} at ${address}`;
    }

    getMissionUrl(mission) {
        const missionId = mission.getAttribute('data-mission-id');
        return `https://www.leitstellenspiel.de/missions/${missionId}`;
    }

    getVehicleUrl(vehicle) {
        const vehicleId = vehicle.getAttribute('data-vehicle-id');
        return `https://www.leitstellenspiel.de/vehicles/${vehicleId}`;
    }

    getMissingVehicles(mission) {
        const required = mission.querySelector('.required-vehicles')?.textContent || '';
        const enRoute = mission.querySelector('.en-route-vehicles')?.textContent || '';
        return required.split(',').filter(v => !enRoute.includes(v)).join(', ');
    }

    getSpecialRequirements(mission) {
        const requirements = [];
        const patientInfo = mission.querySelector('.patient-info');
        
        if (patientInfo) {
            if (patientInfo.querySelector('.nef-required')) requirements.push('NEF');
            if (patientInfo.querySelector('.rth-required')) requirements.push('RTH');
            if (patientInfo.querySelector('.lna-required')) requirements.push('LNA');
            if (patientInfo.querySelector('.orgl-required')) requirements.push('OrgL');
            if (patientInfo.querySelector('.seg-required')) requirements.push('SEG');
        }

        return requirements;
    }

    isLargeMission(mission) {
        const vehicleCount = mission.querySelectorAll('.required-vehicle').length;
        return vehicleCount >= 5; // Adjust threshold as needed
    }

    notifyEvent(category, eventData) {
        const settings = GM_getValue('settings');
        if (!settings || !settings.categories[category]?.enabled) return;

        if (category === EVENT_CATEGORIES.PATIENT_TRANSPORTS && settings.excludeTransports) {
            return;
        }

        sendDiscordNotification({
            ...eventData,
            category
        });
    }
} 