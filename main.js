
var PP = [
    "发", "额", "眉", "太阳", "睑", "睛", "瞳", "眼袋", "颧", "鼻", "耳", "颊", "颌" 
];

var iOS = false;
var imageReady = false;
var current_faces = [];
var image_orig_width = 0, image_orig_height = 0, image_orig_rotation = 0;

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
    if (true) {
        faceService.detectFaces({
            data: img,
            success: function(result) {
                renderImageFaces(result.Faces, orientation);
            },
            error: function(msg) {
                error(msg);
            }
        });
    } else {
        renderImageFaces(DetectResult.Faces, orientation);
    }
}

function drawFaceRects() {
    var n, t;
    if ($("#faces").html("<div><\/div>"), n = $("#imgObj"), t = $("#imgDiv"), current_faces != null) {
        var i = n.height() / image_orig_height,
            r = n.width() / image_orig_width,
            u = n.offset().left - t.offset().left,
            f = current_faces.length;
        $.each(current_faces, function(t, e) {
            var s = e.faceRectangle,
                l = e.attributes.age,
                a = e.attributes.gender,
                o = {},
                h, c;
            o.top = Math.round(i * s.top);
            o.height = Math.round(i * s.height);
            o.left = Math.round(r * s.left) + u;
            o.width = Math.round(r * s.width);
            h = adjustRectOrientation(o, n.width(), n.height(), image_orig_rotation);
            c = $("#faces");
            add_rect(h, l, a, t, c, f)
        })
    }
}

function adjustRectOrientation(n, t, i, r) {
    var u = {};
    return iOS || r === 0 ? n : r === 270 ? (u.height = n.width, u.width = n.height, u.left = n.top, u.top = i - u.height - n.left, u) : r === 180 ? (u.height = n.height, u.width = n.width, u.left = t - u.width - n.left, u.top = i - u.height - n.top, u) : r === 90 ? (u.height = n.width, u.width = n.height, u.left = t - u.width - n.top, u.top = n.left, u) : n
}

function renderImageFaces(n, t) {
    current_faces = n;
    updateOrigImageDimensions(drawFaceRects, t)
}

function updateOrigImageDimensions(n, t) {
    var r = document.getElementById("imgObj"),
        i = new Image;
    i.onload = function() {
        image_orig_width = iOS && (t === 270 || t === 90) ? i.height : i.width;
        image_orig_height = iOS && (t === 270 || t === 90) ? i.width : i.height;
        image_orig_rotation = t;
        n()
    };
    i.src = r.src
}

function deleteFaceRects() {
    current_faces = [];
    $("#faces").html("<div><\/div>")
}

function add_rect(n, t, i, r, u, f) {
    var o = "rect" + Math.round(Math.random() * 1e4),
        c = "n/a",
        l;
    t != null && (c = Math.round(Number(t)));
    l = '<div data-html="true" " id="' + o + '"/>';
    $(l).appendTo(u).css("left", n.left + "px").css("top", n.top + "px").css("width", n.width + "px").css("height", n.height + "px").css("border", "1px solid white").css("position", "absolute");
};


