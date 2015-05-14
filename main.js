
var PP = [
    "发", "额", "眉", "睑", "睛", "瞳", "颧", "鼻", "耳", "颊", "颌" 
];

var mock = true;
var debug = true;
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

function toggle(name) {
    if (!imageReady) {
        error("Image not ready");
    }
    switch (name) {
    }
}

function initButton(name) {
    return $("<button></button>").text(name)
        .addClass("btn btn-primary")
        .click(function() {
            $(this).addClass("active")
                .siblings().removeClass("active");
            toggle($(this).text());
        });
}

function initButtons() {
    for (var i in PP) {
        $("#buttonGroup1").append(initButton(PP[i]));
    }
    $("#buttonGroup1").hide();
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
        deleteFaceRects();
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
    if (!mock) {
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
    return x * factor.scaleX + (nopad ? 0 : factor.paddingX);
}

function factorY(y, nopad) {
    return y * factor.scaleY + (nopad ? 0 : factor.paddingY);
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
    if (face.faceRectangle) {
        face.scaledFaceRectangle = adjustRectOrientation({
            top: factorY(face.faceRectangle.top),
            left: factorX(face.faceRectangle.left),
            width: factorX(face.faceRectangle.width, true),
            height: factorY(face.faceRectangle.height, true),
        });
    }
    if (face.faceLandmarks) {
        face.scaledFaceLandmarks = {};
        for (var mark in face.faceLandmarks) {
            face.scaledFaceLandmarks[mark] = adjustSpotOrientation({
                x : factorX(face.faceLandmarks[mark].x),
                y : factorY(face.faceLandmarks[mark].y)
            });
        }
    }
    calcFaceParts(face);
    return face;
}

function calcFaceParts(f) {
    rotateFaceLandmarks2Vertical(f);
    var p = f.rotatedScaledFaceLandmarks;
    var o = {};
    var inchLeft = p.noseLeftAlarTop.y - p.noseRootLeft.y;
    var inchRight = p.noseRightAlarTop.y - p.noseRootRight.y;
    o.eyebrowTopLeft = {
        x : p.eyebrowLeftOuter.x + (p.eyebrowLeftInner.x - p.eyebrowLeftOuter.x) / 3,
        y : p.eyebrowLeftOuter.y - (p.pupilLeft.y - p.eyeLeftTop.y)
    };
    o.eyebrowTopRight = {
        x : p.eyebrowRightOuter.x - (p.eyebrowRightOuter.x - p.eyebrowRightInner.x) / 3,
        y : p.eyebrowRightOuter.y - (p.pupilRight.y - p.eyeRightTop.y)
    };
    o.foreheadLowerLeft = {
        x : p.eyeLeftTop.x,
        y : o.eyebrowTopLeft.y
    };
    o.foreheadLowerRight = {
        x : p.eyeRightTop.x,
        y : o.eyebrowTopRight.y
    };
    o.foreheadUpperLeft = {
        x : o.foreheadLowerLeft.x,
        y : o.foreheadLowerLeft.y - inchLeft 
    };
    o.foreheadUpperRight = {
        x : o.foreheadLowerRight.x,
        y : o.foreheadLowerRight.y - inchRight
    };
    o.eyelidLowerTipLeft = {
        x : p.eyeLeftBottom.x,
        y : p.eyeLeftBottom.y + inchLeft / 3
    };
    o.eyelidLowerTipRight = {
        x : p.eyeRightBottom.x,
        y : p.eyeRightBottom.y + inchRight / 3
    };
    o.cheekUpperOuterLeft = {
        x : p.eyebrowLeftOuter.x,
        y : o.eyelidLowerTipLeft.y
    };
    o.cheekUpperOuterRight = {
        x : p.eyebrowRightOuter.x,
        y : o.eyelidLowerTipRight.y
    };
    o.cheekUpperInnerLeft = {
        x : p.eyeLeftInner.x,
        y : o.eyelidLowerTipLeft.y
    };
    o.cheekUpperInnerRight = {
        x : p.eyeRightInner.x,
        y : o.eyelidLowerTipRight.y
    };
    o.cheekLowerOuterLeft = {
        x : p.eyebrowLeftOuter.x / 2 + p.eyeLeftOuter.x / 2,
        y : p.noseLeftAlarOutTip.y
    };
    o.cheekLowerOuterRight = {
        x : p.eyebrowRightOuter.x / 2 + p.eyeRightOuter.x / 2,
        y : p.noseRightAlarOutTip.y
    };
    o.cheekLowerInnerLeft = {
        x : p.eyeLeftInner.x - (p.eyeLeftInner.x - p.eyeLeftTop.x) / 4,
        y : o.cheekLowerOuterLeft.y
    };
    o.cheekLowerInnerRight = {
        x : p.eyeRightInner.x + (p.eyeRightInner.x - p.eyeRightTop.x) / 4,
        y : o.cheekLowerOuterRight.y
    };
    o.cheekLowerTipLeft = {
        x : p.eyeLeftOuter.x,
        y : p.noseTip.y / 2 + p.upperLipTop.y / 2
    };
    o.cheekLowerTipRight = {
        x : p.eyeRightOuter.x,
        y : o.cheekLowerTipLeft.y 
    };
    o.cheekBottomLeft = {
        x : o.cheekUpperOuterLeft.x,
        y : p.mouthLeft.y
    };
    o.cheekBottomRight = {
        x : o.cheekUpperOuterRight.x,
        y : p.mouthRight.y
    };
    o.jawLowerLeft = {
        x : p.noseLeftAlarOutTip.x,
        y : p.mouthLeft.y + inchLeft
    };
    o.jawLowerRight = {
        x : p.noseRightAlarOutTip.x,
        y : p.mouthRight.y + inchRight
    };

    f.rotatedCalculatedFaceLandmarks = o;
    rotateFaceLandmarks2BaseAngle(f);
}

function rotateFaceLandmarks2Vertical(f) {
    var l = f.scaledFaceLandmarks["noseRootLeft"];
    var r = f.scaledFaceLandmarks["noseRootRight"];
    factor.base = {
        x : f.scaledFaceLandmarks["noseTip"].x,
        y : f.scaledFaceLandmarks["noseTip"].y
    };
    factor.angleB = calcAngle(l, r);
    f.rotatedScaledFaceLandmarks = {
        "noseTip" : factor.base
    };
    for (var i in f.scaledFaceLandmarks) {
        if (i !== "noseTip") {
            f.rotatedScaledFaceLandmarks[i] = rotate2Vertical(factor.base, factor.angleB, f.scaledFaceLandmarks[i]);
        }
    }
}

function rotateFaceLandmarks2BaseAngle(f) {
    if (f.rotatedCalculatedFaceLandmarks) {
        f.calculatedFaceLandmarks = {};
        for (var i in f.rotatedCalculatedFaceLandmarks) {
            f.calculatedFaceLandmarks[i] = rotate2BaseAngle(factor.base, factor.angleB, f.rotatedCalculatedFaceLandmarks[i]);
        }
    }
}

function rotate2BaseAngle(base, angleB, pos) {
    var d = Math.sqrt(Math.pow(pos.x - base.x, 2) + Math.pow(pos.y - base.y, 2));
    var angleP = calcAngle(base, pos);
    var r = {
        x : base.x,
        y : base.y,
        d : d,
        angleP : angleP
    };
    var sinP_B, cosP_B;
    if (angleP.dX === angleB.dX && angleP.dY === angleB.dY || 
       (angleP.dX !== angleB.dX && angleP.dY !== angleB.dY)) {
        sinP_B = angleP.cos * angleB.sin + angleP.sin * angleB.cos;
        cosP_B = angleP.cos * angleB.cos - angleP.sin * angleB.sin;
    } else {
        sinP_B = angleP.sin * angleB.cos - angleP.cos * angleB.sin;
        cosP_B = angleP.cos * angleB.cos + angleP.sin * angleB.sin;
    }
    var offsetX = d * cosP_B;
    var offsetY = d * sinP_B;
    r.offsetX = offsetX;
    r.offsetY = offsetY;
    r.sin = sinP_B;
    r.cos = sinP_B;
    r.branch = 1;
    r.x += angleP.dX * offsetX;
    r.y += angleP.dY * offsetY;
    return r;
}

function rotate2Vertical(base, angleB, pos) {
    var d = Math.sqrt(Math.pow(pos.x - base.x, 2) + Math.pow(pos.y - base.y, 2));
    var angleP = calcAngle(base, pos);
    var r = {
        x : base.x,
        y : base.y,
        d : d,
        angleP : angleP
    };
    var sinP_B, cosP_B;
    if (angleP.dX === angleB.dX && angleP.dY === angleB.dY || 
       (angleP.dX !== angleB.dX && angleP.dY !== angleB.dY)) {
        sinP_B = angleP.sin * angleB.cos - angleP.cos * angleB.sin;
        cosP_B = angleP.cos * angleB.cos + angleP.sin * angleB.sin;
    } else {
        sinP_B = angleP.cos * angleB.sin + angleP.sin * angleB.cos;
        cosP_B = angleP.cos * angleB.cos - angleP.sin * angleB.sin;
    }
    var offsetX = d * cosP_B;
    var offsetY = d * sinP_B;
    r.offsetX = offsetX;
    r.offsetY = offsetY;
    r.sin = sinP_B;
    r.cos = sinP_B;
    r.branch = 1;
    r.x += angleP.dX * offsetX;
    r.y += angleP.dY * offsetY;
    return r;
}

function calcAngle(base, pos) {
    var tan = Math.abs((pos.y - base.y) / (pos.x - base.x));
    return {
        dX : pos.x >= base.x ? 1 : -1,
        dY : pos.y >= base.y ? 1 : -1,
        tan : tan,
        sin : tan / Math.sqrt(1 + Math.pow(tan, 2)),
        cos : 1 / Math.sqrt(1 + Math.pow(tan, 2))
    };
}

function drawFacePolygons(f) {
    if (f.calculatedFaceLandmarks) {
        var imgObj = $("#imgDiv");
        $("#svg").css("position", "absolute")
            .css("left", imgObj.offset().left)
            .css("top", imgObj.offset().top)
            .css("width", imgObj.width())
            .css("height", imgObj.height());

        // jquery.appendTo or html container.appendChild not working for polygon, not knowing why
        // maybe the created polygon has no parent element
        var container = $("#svg");
        var o = f.calculatedFaceLandmarks;
        var polygons = [
            newPolygon([
                o["foreheadUpperLeft"],
                o["foreheadLowerLeft"],
                o["foreheadLowerRight"],
                o["foreheadUpperRight"]
            ]),
            newPolygon([
                o.cheekUpperOuterLeft,
                o.cheekLowerOuterLeft,
                o.cheekLowerTipLeft,
                o.cheekLowerInnerLeft,
                o.cheekUpperInnerLeft
            ]),
        ];
        container[0].innerHTML = polygons.join();
    }
}

function newPolygon(p) {
    var html = "<polygon points=\"";
    for (var i in p) {
        html += p[i].x + "," + p[i].y + " ";
    }
    html += "\" style=\"fill:brown;opacity:0.5\" />";
    return html;
}

function drawFaceRects() {
    if (current_faces != null) {
        $("#faces").html("<div><\/div>");
        var container = $("#faces");
        $.each(current_faces, function(t, face) {
            var f = scaleFace(face);
            addFaceRectangle(f, container);
            if (debug) {
                addFaceLandmarks(f.scaledFaceLandmarks, container, (f.attributes.gender === "female" ? "femalefacespot" : "malefacespot"));
                if (f.rotatedScaledFaceLandmarks) {
                    addFaceLandmarks(f.rotatedScaledFaceLandmarks, container, "rotatefacespot");
                }
                if (f.rotatedCalculatedFaceLandmarks) {
                    addFaceLandmarks(f.rotatedCalculatedFaceLandmarks, container, "rotatedcalculatedfacespot");
                }
                if (f.calculatedFaceLandmarks) {
                    addFaceLandmarks(f.calculatedFaceLandmarks, container, "calculatedfacespot");
                }
            }
            drawFacePolygons(f);
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
    var pos = face.scaledFaceRectangle;
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

function addFaceLandmarks(landmarks, container, c) {
    if (!landmarks) {
        return;
    }
    for (var mark in landmarks) {
        var spot = landmarks[mark];
        var div = '<div data-html="true"/>';
        $(div).appendTo(container)
            .css("left", spot.x + "px")
            .css("top", spot.y + "px")
            .css("position", "absolute")
            .addClass("facespot")
            .addClass(c)
            .tooltip({
                show: true,
                placement: "auto",
                title: "<div>" + mark + "</div>",
                html: true 
            });
    }
}
