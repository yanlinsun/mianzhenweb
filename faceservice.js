var FaceService = function(subscriptKey) {
    this.serviceHost = "https://api.projectoxford.ai/face/v0/detections?analyzesFaceLandmarks=true&analyzesAge=true&analyzesGender=true&analyzesHeadPost=true";
    this.subscriptKey = subscriptKey;
};

FaceService.prototype.detectFaces = function(data) {
    if (data && data.data) {
        $.ajax({
            type: "POST",
            url: this.serviceHost,
            contentType: "application/octet-stream",
            processData: false,
            data: data.data,
            headers: {
                "ocp-apim-subscription-key": this.subscriptKey
            },
            success: function(r) {
                if (r == null || r.length === 0) {
                    data.error("No face deteded");
                } else {
                    data.success(r);
                }
            },
            error: data.error
        });
    } else {
        console.log("Invalid argument:" + data);
    }
};
