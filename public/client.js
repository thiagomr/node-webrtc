class Client {
    constructor({ socket }) {
        this.socket = socket;
        this.peerConnections = {};
        this.localStream = null;
        this.localVideo = null;
        this.streamOptions = {
            video: true
        };
        this.peerConfig = {
            iceServers: [
              {
                urls: ["stun:stun.l.google.com:19302"]
              }
            ]
        };
    }

    getUserMedia() {
        return navigator
            .mediaDevices
            .getUserMedia(this.streamOptions);
    }

    setup() {
        this.registerEvents();
        this.getUserMedia()
            .then(stream => {
                this.addVideo('local-video', stream);
                this.localStream = stream;
                this.socket.emit("broadcaster", socket.id);
            });
    }

    addVideo(videoElement) {
        const videoGrid = document.getElementById('video-div');
        videoGrid.appendChild(videoElement);
    }

    broadcaster(id) {
        console.log('broadcaster', id);

        if (!this.peerConnections[id]) {
            this.socket.emit('broadcaster', this.socket.id);
        }

        this.socket.emit("watcher", id);
    }

    watcher(id) {
        console.log('watcher', id);

        if (this.peerConnections[id]) {
            return;
        }

        const peerConnection = new RTCPeerConnection(this.peerConfig);
        this.peerConnections[id] = peerConnection;
        this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream));

        peerConnection
            .createOffer()
            .then(sdp => peerConnection.setLocalDescription(sdp))
            .then(() => this.socket.emit("offer", id, peerConnection.localDescription));
    }

    addVideo(id, stream) {
        const videoGrid = document.getElementById('video-div');
        const video = document.createElement('video');

        video.id = id;
        video.autoplay = true;
        video.srcObject = stream;

        videoGrid.appendChild(video);

        return video;
    }

    offer(id, description) {
        console.log('offer', id);

        const peerConnection = new RTCPeerConnection(this.peerConfig);
        this.peerConnections[this.socket.id] = peerConnection;

        peerConnection
            .setRemoteDescription(description)
            .then(() => peerConnection.createAnswer())
            .then(sdp => peerConnection.setLocalDescription(sdp))
            .then(() => {
                this.socket.emit("answer", id, peerConnection.localDescription);
            });

        peerConnection.ontrack = event => this.addVideo(id, event.streams[0]);
        peerConnection.onicecandidate = event => event ? this.socket.emit("candidate", id, event.candidate) : null;
    }

    answer(id, description) {
        console.log('answer', id);
        this.peerConnections[id].setRemoteDescription(description);
    }

    candidate(id, candidate) {
        console.log('candidate', id);

        if (candidate) {
            this.peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    disconnected(id) {
        document.getElementById(id).remove();
        delete this.peerConnections[id];
    }

    registerEvents() {
        this.socket.on('broadcaster', this.broadcaster.bind(this));
        this.socket.on('watcher', this.watcher.bind(this));
        this.socket.on('offer', this.offer.bind(this));
        this.socket.on('answer', this.answer.bind(this));
        this.socket.on('candidate', this.candidate.bind(this));
        this.socket.on('disconnected', this.disconnected.bind(this));
    }
}

const socket = io.connect(window.location.origin);
const client = new Client({ socket });

client.setup();
