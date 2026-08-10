import AppKit
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let outputURL = root.appendingPathComponent("hayes-save-the-date-card.png")

let pixelWidth = 1600
let pixelHeight = 1600
let width = CGFloat(pixelWidth)
let height = CGFloat(pixelHeight)
let canvas = NSRect(x: 0, y: 0, width: width, height: height)

func color(_ hex: UInt32, alpha: CGFloat = 1) -> NSColor {
    NSColor(
        calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
        green: CGFloat((hex >> 8) & 0xff) / 255,
        blue: CGFloat(hex & 0xff) / 255,
        alpha: alpha
    )
}

func paragraph(alignment: NSTextAlignment = .center, lineHeight: CGFloat? = nil) -> NSMutableParagraphStyle {
    let style = NSMutableParagraphStyle()
    style.alignment = alignment
    if let lineHeight {
        style.minimumLineHeight = lineHeight
        style.maximumLineHeight = lineHeight
    }
    return style
}

func drawText(_ text: String, rect: NSRect, font: NSFont, color: NSColor, alignment: NSTextAlignment = .center, lineHeight: CGFloat? = nil, kern: CGFloat = 0) {
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: paragraph(alignment: alignment, lineHeight: lineHeight),
        .kern: kern
    ]
    text.draw(in: rect, withAttributes: attrs)
}

func drawLine(from start: NSPoint, to end: NSPoint, width: CGFloat = 5) {
    let path = NSBezierPath()
    path.move(to: start)
    path.line(to: end)
    NSColor.black.setStroke()
    path.lineWidth = width
    path.lineCapStyle = .round
    path.stroke()
}

func drawLeaf(center: NSPoint, size: CGSize, rotation: CGFloat) {
    let path = NSBezierPath(ovalIn: NSRect(x: center.x - size.width / 2, y: center.y - size.height / 2, width: size.width, height: size.height))
    var transform = AffineTransform()
    transform.translate(x: center.x, y: center.y)
    transform.rotate(byDegrees: rotation)
    transform.translate(x: -center.x, y: -center.y)
    path.transform(using: transform)
    NSColor.black.setFill()
    path.fill()
}

func drawCurvedText(_ text: String, center: NSPoint, radius: CGFloat, startAngle: CGFloat, endAngle: CGFloat, font: NSFont, kern: CGFloat = 0) {
    let chars = Array(text)
    guard chars.count > 1 else { return }
    let step = (endAngle - startAngle) / CGFloat(chars.count - 1)
    for (index, char) in chars.enumerated() {
        let angle = startAngle + CGFloat(index) * step
        let radians = angle * .pi / 180
        let x = center.x + cos(radians) * radius
        let y = center.y + sin(radians) * radius
        let string = String(char) as NSString
        let attrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: NSColor.black,
            .kern: kern
        ]
        let size = string.size(withAttributes: attrs)
        NSGraphicsContext.saveGraphicsState()
        let transform = NSAffineTransform()
        transform.translateX(by: x, yBy: y)
        transform.rotate(byDegrees: angle - 90)
        transform.translateX(by: -size.width / 2, yBy: -size.height / 2)
        transform.concat()
        string.draw(at: .zero, withAttributes: attrs)
        NSGraphicsContext.restoreGraphicsState()
    }
}

func drawTree(in rect: NSRect) {
    let base = NSPoint(x: rect.midX, y: rect.minY + 18)
    let trunkTop = NSPoint(x: rect.midX, y: rect.minY + 170)

    let trunk = NSBezierPath()
    trunk.move(to: NSPoint(x: base.x - 40, y: base.y))
    trunk.curve(to: trunkTop, controlPoint1: NSPoint(x: base.x - 26, y: base.y + 70), controlPoint2: NSPoint(x: base.x - 22, y: base.y + 130))
    trunk.curve(to: NSPoint(x: base.x + 40, y: base.y), controlPoint1: NSPoint(x: base.x + 24, y: base.y + 130), controlPoint2: NSPoint(x: base.x + 24, y: base.y + 70))
    trunk.close()
    NSColor.black.setFill()
    trunk.fill()

    let branches: [(NSPoint, NSPoint, CGFloat)] = [
        (trunkTop, NSPoint(x: rect.midX - 210, y: rect.minY + 250), 13),
        (trunkTop, NSPoint(x: rect.midX + 210, y: rect.minY + 255), 13),
        (NSPoint(x: rect.midX - 12, y: rect.minY + 130), NSPoint(x: rect.midX - 250, y: rect.minY + 145), 12),
        (NSPoint(x: rect.midX + 12, y: rect.minY + 128), NSPoint(x: rect.midX + 245, y: rect.minY + 150), 12),
        (NSPoint(x: rect.midX - 38, y: rect.minY + 200), NSPoint(x: rect.midX - 130, y: rect.minY + 330), 10),
        (NSPoint(x: rect.midX + 36, y: rect.minY + 205), NSPoint(x: rect.midX + 135, y: rect.minY + 335), 10),
        (NSPoint(x: rect.midX - 120, y: rect.minY + 230), NSPoint(x: rect.midX - 245, y: rect.minY + 330), 7),
        (NSPoint(x: rect.midX + 120, y: rect.minY + 235), NSPoint(x: rect.midX + 245, y: rect.minY + 340), 7),
        (NSPoint(x: rect.midX - 65, y: rect.minY + 260), NSPoint(x: rect.midX - 25, y: rect.minY + 390), 7),
        (NSPoint(x: rect.midX + 65, y: rect.minY + 265), NSPoint(x: rect.midX + 28, y: rect.minY + 390), 7)
    ]

    for branch in branches {
        drawLine(from: branch.0, to: branch.1, width: branch.2)
    }

    let leaves: [(CGFloat, CGFloat, CGFloat, CGFloat, CGFloat)] = [
        (-270, 190, 44, 24, -28), (-230, 260, 42, 24, 28), (-185, 335, 38, 22, -35),
        (-120, 380, 42, 24, 18), (-52, 410, 38, 22, -8), (15, 412, 38, 22, 18),
        (80, 382, 42, 24, -18), (150, 342, 42, 24, 32), (220, 270, 44, 24, -26),
        (274, 196, 42, 24, 20), (-300, 125, 38, 22, 14), (-250, 105, 38, 22, -26),
        (-205, 160, 36, 20, 36), (-160, 210, 36, 20, -16), (-105, 290, 36, 20, 24),
        (-40, 318, 34, 20, -28), (40, 320, 34, 20, 22), (105, 292, 36, 20, -20),
        (160, 212, 36, 20, 18), (205, 162, 36, 20, -36), (252, 112, 38, 22, 26),
        (300, 132, 38, 22, -14), (-88, 142, 32, 18, 28), (88, 142, 32, 18, -28)
    ]

    for leaf in leaves {
        drawLeaf(center: NSPoint(x: rect.midX + leaf.0, y: rect.minY + leaf.1), size: CGSize(width: leaf.2, height: leaf.3), rotation: leaf.4)
    }

    drawLine(from: NSPoint(x: rect.midX - 250, y: rect.minY + 54), to: NSPoint(x: rect.midX + 250, y: rect.minY + 54), width: 8)
}

let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: pixelWidth,
    pixelsHigh: pixelHeight,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)

color(0xefeeeb).setFill()
canvas.fill()

for i in 0..<34 {
    let x = CGFloat((i * 137) % 1600)
    let y = CGFloat((i * 229) % 1600)
    let path = NSBezierPath()
    path.move(to: NSPoint(x: x - 130, y: y))
    path.curve(to: NSPoint(x: x + 150, y: y + 30), controlPoint1: NSPoint(x: x - 40, y: y + 90), controlPoint2: NSPoint(x: x + 70, y: y - 80))
    color(i % 3 == 0 ? 0xd8d1c7 : 0xffffff, alpha: 0.22).setStroke()
    path.lineWidth = CGFloat(5 + (i % 5))
    path.stroke()
}

let card = NSRect(x: 350, y: 120, width: 900, height: 1360)
let shadow = NSShadow()
shadow.shadowColor = color(0x000000, alpha: 0.2)
shadow.shadowBlurRadius = 18
shadow.shadowOffset = NSSize(width: 0, height: -8)
NSGraphicsContext.saveGraphicsState()
shadow.set()
color(0xf7f7f4).setFill()
NSBezierPath(rect: card).fill()
NSGraphicsContext.restoreGraphicsState()

color(0xd4d1ca).setStroke()
let border = NSBezierPath(rect: card)
border.lineWidth = 2
border.stroke()

drawText("09 | 01-03 | 2027", rect: NSRect(x: card.minX, y: card.maxY - 88, width: card.width, height: 42), font: NSFont(name: "Avenir Next Medium", size: 36) ?? NSFont.systemFont(ofSize: 36), color: NSColor.black, kern: 4)

drawCurvedText("SAVE the DATE", center: NSPoint(x: card.midX, y: card.maxY - 435), radius: 285, startAngle: 150, endAngle: 30, font: NSFont(name: "Avenir Next Regular", size: 46) ?? NSFont.systemFont(ofSize: 46), kern: 3)

drawTree(in: NSRect(x: card.minX + 130, y: card.maxY - 645, width: card.width - 260, height: 430))

drawText("HAYES", rect: NSRect(x: card.minX + 120, y: card.maxY - 770, width: card.width - 240, height: 62), font: NSFont(name: "Avenir Next Regular", size: 58) ?? NSFont.systemFont(ofSize: 58), color: NSColor.black, kern: 12)
drawText("Family Reunion", rect: NSRect(x: card.minX + 160, y: card.maxY - 820, width: card.width - 320, height: 48), font: NSFont(name: "Georgia Italic", size: 42) ?? NSFont.systemFont(ofSize: 42), color: NSColor.black)
drawLine(from: NSPoint(x: card.minX + 160, y: card.maxY - 850), to: NSPoint(x: card.maxX - 160, y: card.maxY - 850), width: 4)

drawText("Charleston, South Carolina", rect: NSRect(x: card.minX + 120, y: card.maxY - 965, width: card.width - 240, height: 54), font: NSFont(name: "Georgia Italic", size: 38) ?? NSFont.systemFont(ofSize: 38), color: NSColor.black)

drawText("- MORE INFORMATION TO COME -", rect: NSRect(x: card.minX + 120, y: card.maxY - 1088, width: card.width - 240, height: 34), font: NSFont(name: "Avenir Next Demi Bold", size: 22) ?? NSFont.boldSystemFont(ofSize: 22), color: NSColor.black, kern: 3)
drawText("August 31 - September 3, 2027", rect: NSRect(x: card.minX + 120, y: card.maxY - 1140, width: card.width - 240, height: 34), font: NSFont(name: "Avenir Next Medium", size: 25) ?? NSFont.systemFont(ofSize: 25), color: NSColor.black, kern: 1.2)
drawText("Honoring Our Legacy. Celebrating Our Family.", rect: NSRect(x: card.minX + 110, y: card.maxY - 1184, width: card.width - 220, height: 32), font: NSFont(name: "Avenir Next Medium", size: 23) ?? NSFont.systemFont(ofSize: 23), color: NSColor.black)
drawText("Building Our Future.", rect: NSRect(x: card.minX + 120, y: card.maxY - 1223, width: card.width - 240, height: 30), font: NSFont(name: "Avenir Next Medium", size: 23) ?? NSFont.systemFont(ofSize: 23), color: NSColor.black)

NSGraphicsContext.restoreGraphicsState()

if let data = bitmap.representation(using: .png, properties: [:]) {
    try data.write(to: outputURL)
    print(outputURL.path)
}
