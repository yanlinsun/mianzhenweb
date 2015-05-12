var FaceService = function(subscriptKey) {
    this.serviceHost = "https://api.projectoxford.ai/face/v0/detections?analyzeFacialLandmarks=true&analyzesAge=true&analyzesGender=true&analyzesHeadPost=true";
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
            success: function(raw) {
                var r = JSON.parse(raw);
                if (r == null || r.Faces == null || r.Faces.length === 0) {
                    data.error("No face deteded");
                } else {
                    data.success(r);
                }
            },
            error: data.error,
            beforeSend: function(xhr) {
                xhr.setRequestHeader("ocp-apim-subscription-key", this.subscriptKey);
                xhr.setRequestHeader("Origin", "www.google.com");
            }
        });
    } else {
        console.log("Invalid argument:" + data);
    }
};
