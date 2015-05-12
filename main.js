
var PP = [
    "发", "额", "眉", "太阳", "睑", "睛", "瞳", "眼袋", "颧", "鼻", "耳", "颊", "颌" 
];

var test = false;
var iOS = false;
var imageReady = false;
var current_faces = [];
var factor = {
    originalW : 0,
    originalH : 0,
    originalRotation : 0,
    displayW : 0,
    displayH : 0,
    scaleX : 0,
    scaleY : 0,
    paddingX : 0,
    paddingY : 0
};

var faceService = new FaceService("559c332de481437084dd03c720a7b750");

function error(msg) {
    $("#msg").text(msg).show();
        $("#msg").fadeOut(3000);
}

function calculate(name) {
    if (!imageReady) {
        error("Image not ready");
    }
    switch (name) {
    }
}

function clearPP() {
}

function initButton(name) {
    return $("<button></button>").text(name)
        .addClass("btn btn-primary")
        .click(function() {
            $(this).addClass("active")
                .siblings().removeClass("active");
            calculate($(this).text());
        });
}

function initButtons() {
    for (var i in PP) {
        $("#buttonGroup1").append(initButton(PP[i]));
    }
}

function imageSelected(e) {
    if (this.files.length == 0) {
        return;
    }
    var file = this.files[0];

    if (!$("#imgObj")) {
        $("#imgDiv").empty().append($("<img id='imgObj'></img>"));
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var dataURL = reader.result;
        $("#imgObj").attr("src", dataURL).show();
        clearPP();
        loadImage.parseMetaData(e, function(t) {
                var i = 0,
                    r;
                t && t.exif && (r = t.exif.get("Orientation"), r === 8 ? i = 90 : r === 3 ? i = 180 : r === 6 && (i = 270));
        detectFace(file, e.size, i);
        });
    };
    reader.readAsDataURL(file);
}

$(function() {
    $("#msg").hide();
    $("#imgObj").hide();
    initButtons();
    $("#imgFile").change(imageSelected).click(function() { $(this).attr("value", null); });
});

function detectFace(img, md, orientation) {
    var errSize = "图片需要大小小于3MB。";
    if (md != null && md.size > 3145728) {
        error(errSize);
    }
    img = $("#imgFile").get(0).files[0];
    if (!test) {
        faceService.detectFaces({
            data: img,
            success: function(faces) {
                renderImageFaces(faces, orientation);
            },
            error: function(msg) {
                error(msg);
            }
        });
    } else {
        renderImageFaces(DetectResult, orientation);
    }
}


function factorX(x, nopad) {
    return Math.round(x * factor.scaleX) + (nopad ? 0 : factor.paddingX);
}

function factorY(y, nopad) {
    return Math.round(y * factor.scaleY) + (nopad ? 0 : factor.paddingY);
}

function adjustRectOrientation(rect) {
    if (iOS) {
        return rect;
    }
    var u = {};
    switch (factor.originalRotation) {
        case 90:
            u.height = rect.width;
            u.width = rect.height;
            u.left = factor.displayW - u.width - rect.top;
            u.top = rect.left;
            break;
        case 180:
            u.height = rect.height;
            u.width = rect.width;
            u.left = factor.displayW - u.width - rect.left;
            u.top = factor.displayH - u.height - rect.top;
            break;
        case 270:
            u.height = rect.width;
            u.width = rect.height;
            u.left = rect.top;
            u.top = factor.displayH - u.height - rect.left;
            break;
        default:
            u = rect;
            break;
    }
    return u;
}

function adjustSpotOrientation(spot) {
    if (iOS) {
        return spot;
    }
    var u = {};
    switch (factor.originalRotation) {
        case 90:
            u.x = factor.displayW - spot.y;
            u.y = spot.x;
            break;
        case 180:
            u.x = factor.displayW - spot.x;
            u.y = factor.displayH - spot.y;
            break;
        case 270:
            u.x = spot.y;
            u.y = factor.displayH - spot.x;
            break;
        default:
            u = spot;
            break;
    }
    return u;
}

function scaleFace(face, factor) {
    var f = {
        faceId : face.faceId
    };

    if (face.faceRectangle) {
        f.faceRectangle = adjustRectOrientation({
            top: factorY(face.faceRectangle.top),
            left: factorX(face.faceRectangle.left),
            width: factorX(face.faceRectangle.width, true),
            height: factorY(face.faceRectangle.height, true),
        });
    }
    if (face.faceLandmarks) {
        f.faceLandmarks = {};
        for (var mark in face.faceLandmarks) {
            f.faceLandmarks[mark] = adjustSpotOrientation({
                x : factorX(face.faceLandmarks[mark].x),
                y : factorY(face.faceLandmarks[mark].y)
            });
        }
    }
    if (face.attributes) {
        f.attributes = {
            age : face.attributes.age,
            gender : face.attributes.gender
        };
        if (face.attributes.headPose) {
            f.attributes.headPose = {
                roll : face.attributes.headPose.roll,
                yaw : face.attributes.headPose.yaw,
                pitch : face.attributes.headPose.pitch
            };
        }
    }
    return f;
}

function drawFaceRects() {
    if (current_faces != null) {
        $("#faces").html("<div><\/div>");
        var container = $("#faces");
        $.each(current_faces, function(t, face) {
            var f = scaleFace(face);
            addFaceRectangle(f, container);
            addFaceLandmarks(f, container);
        })
    }
}

function renderImageFaces(faces, orientation) {
    current_faces = faces;
    updateOrigImageDimensions(orientation, drawFaceRects);
}

function updateOrigImageDimensions(orientation, callback) {
    var r = document.getElementById("imgObj");
    var i = new Image();
    i.onload = function() {
        factor.originalW = iOS && (orientation === 270 || orientation === 90) ? i.height : i.width;
        factor.originalH = iOS && (orientation === 270 || orientation === 90) ? i.width : i.height;
        factor.originalRotation = orientation;
        var imgDiv = $("#imgDiv");
        var imgObj = $("#imgObj");
        factor.displayW = imgObj.width();
        factor.displayH = imgObj.height();
        factor.scaleY = factor.displayH / factor.originalH;
        factor.scaleX = factor.displayW / factor.originalW;
        factor.paddingX = imgObj.offset().left - imgDiv.offset().left;
        factor.paddingY = imgObj.offset().top - imgDiv.offset().top;
        callback();
    };
    i.src = r.src;
}

function deleteFaceRects() {
    current_faces = [];
    $("#faces").html("<div><\/div>")
}

function addFaceRectangle(face, container) {
    var pos = face.faceRectangle;
    var txt = "";
    if (face.attributes.gender && face.attributes.gender === "female") {
        txt = "女";
    } else {
        txt = "男";
    }
    if (face.attributes.age) {
        txt += Math.round(Number(face.attributes.age)) + "岁";
    }
    var faceDiv = '<div face-html="true" " id="' + face.faceId + '"/>';
    $(faceDiv).appendTo(container)
        .css("left", pos.left + "px")
        .css("top", pos.top + "px")
        .css("width", pos.width + "px")
        .css("height", pos.height + "px")
        .css("border", "1px solid white")
        .css("position", "absolute");
    if (txt != "") {
        var tt = "<div>" + txt + "<\/div>";
        $("#" + face.faceId).tooltip({
            trigger: "manual",
            show: true,
            placement: "top",
            title: tt,
            html: true
        }).tooltip("show");
    }
}

function addFaceLandmarks(face, container) {
    if (!face && !face.faceLandmarks) {
        return;
    }
    var c = "malefacespot";
    if (face.attributes.gender === "female") {
        c = "femalefacespot";
    }
    for (var mark in face.faceLandmarks) {
        var spotId = face.faceId + mark;
        var spot = face.faceLandmarks[mark];
        var div = '<div data-html="true" id="' + spotId + '"/>';
        $(div).appendTo(container)
            .css("left", spot.x + "px")
            .css("top", spot.y + "px")
            //.css("width", "1%")
            //.css("height", "1%")
            //.css("backgroundColor", "white")
            .css("position", "absolute");
        $("#" + spotId)
            .addClass("facespot")
            .addClass(c);
        $("#" + spotId).tooltip({
            show: true,
            placement: "auto",
            title: "<div>" + mark + "</div>",
            html: true 
        });
    }
}
