import AppKit
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let outputURL = root.appendingPathComponent("hayes-save-the-date.png")
let backgroundURL = root.appendingPathComponent("assets/charleston-hero.webp")

let pixelWidth = 1600
let pixelHeight = 2100
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

func drawFillImage(_ image: NSImage, in rect: NSRect, focusY: CGFloat = 0.46) {
    let imageSize = image.size
    let imageRatio = imageSize.width / imageSize.height
    let rectRatio = rect.width / rect.height
    var source = NSRect(origin: .zero, size: imageSize)

    if imageRatio > rectRatio {
        let sourceWidth = imageSize.height * rectRatio
        source.origin.x = (imageSize.width - sourceWidth) / 2
        source.size.width = sourceWidth
    } else {
        let sourceHeight = imageSize.width / rectRatio
        source.origin.y = max(0, min(imageSize.height - sourceHeight, imageSize.height * focusY - sourceHeight / 2))
        source.size.height = sourceHeight
    }

    image.draw(in: rect, from: source, operation: .copy, fraction: 1)
}

func drawRoundedRect(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, strokeWidth: CGFloat = 0) {
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    fill.setFill()
    path.fill()
    if let stroke, strokeWidth > 0 {
        stroke.setStroke()
        path.lineWidth = strokeWidth
        path.stroke()
    }
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

color(0xf6f1e8).setFill()
canvas.fill()

if let background = NSImage(contentsOf: backgroundURL) {
    drawFillImage(background, in: canvas, focusY: 0.42)
}

NSGradient(colors: [
    color(0x0c141f, alpha: 0.58),
    color(0x17314f, alpha: 0.72)
])?.draw(in: canvas, angle: 90)

NSGradient(colors: [
    color(0xd96324, alpha: 0.28),
    color(0x17314f, alpha: 0.12),
    color(0x0c141f, alpha: 0.18)
])?.draw(in: canvas, angle: 0)

let margin: CGFloat = 116
let orange = color(0xff8a45)
let white = NSColor.white
let navy = color(0x17314f)
let paper = color(0xffffff, alpha: 0.94)

let logoY = height - 330
let logoScale: CGFloat = 1.65
let logoX = margin
let markCenter = NSPoint(x: logoX + 72 * logoScale, y: logoY + 75 * logoScale)
let mark = NSBezierPath(ovalIn: NSRect(x: markCenter.x - 50 * logoScale, y: markCenter.y - 50 * logoScale, width: 100 * logoScale, height: 100 * logoScale))
orange.setFill()
mark.fill()
drawText("H", rect: NSRect(x: markCenter.x - 50 * logoScale, y: markCenter.y - 39 * logoScale, width: 100 * logoScale, height: 78 * logoScale), font: NSFont.boldSystemFont(ofSize: 58 * logoScale), color: white)
drawText("Hayes", rect: NSRect(x: logoX + 145 * logoScale, y: logoY + 54 * logoScale, width: 360 * logoScale, height: 68 * logoScale), font: NSFont(name: "Georgia Italic", size: 50 * logoScale) ?? NSFont.systemFont(ofSize: 50 * logoScale), color: white, alignment: .left)
let linePath = NSBezierPath()
linePath.move(to: NSPoint(x: logoX + 145 * logoScale, y: logoY + 68 * logoScale))
linePath.line(to: NSPoint(x: logoX + 425 * logoScale, y: logoY + 68 * logoScale))
orange.setStroke()
linePath.lineWidth = 5 * logoScale
linePath.lineCapStyle = .round
linePath.stroke()
drawText("FAMILY REUNION", rect: NSRect(x: logoX + 145 * logoScale, y: logoY - 12 * logoScale, width: 420 * logoScale, height: 60 * logoScale), font: NSFont.boldSystemFont(ofSize: 35 * logoScale), color: white, alignment: .left, kern: 1.5)

drawText("FAMILY ANNOUNCEMENT", rect: NSRect(x: margin, y: 1370, width: width - margin * 2, height: 52), font: NSFont.boldSystemFont(ofSize: 38), color: orange, kern: 1.4)
drawText("Save the Date", rect: NSRect(x: margin, y: 1068, width: width - margin * 2, height: 290), font: NSFont(name: "Georgia", size: 178) ?? NSFont.systemFont(ofSize: 178), color: white, lineHeight: 178)
drawText("Charleston, South Carolina", rect: NSRect(x: margin, y: 985, width: width - margin * 2, height: 56), font: NSFont.boldSystemFont(ofSize: 48), color: white)

let datePill = NSRect(x: 410, y: 850, width: 780, height: 100)
drawRoundedRect(datePill, radius: 10, fill: color(0xffffff, alpha: 0.16), stroke: color(0xffffff, alpha: 0.42), strokeWidth: 2)
drawText("AUGUST 31 - SEPTEMBER 3, 2028", rect: datePill.insetBy(dx: 24, dy: 25), font: NSFont.boldSystemFont(ofSize: 42), color: white, kern: 1)

let card = NSRect(x: margin, y: 144, width: width - margin * 2, height: 560)
drawRoundedRect(card, radius: 10, fill: paper)

let detailPanel = NSRect(x: card.maxX - 455, y: card.minY + 42, width: 390, height: card.height - 84)
drawRoundedRect(detailPanel, radius: 8, fill: navy)

drawText("DEAR HAYES FAMILY", rect: NSRect(x: card.minX + 64, y: card.maxY - 108, width: 720, height: 42), font: NSFont.boldSystemFont(ofSize: 28), color: orange, alignment: .left, kern: 1)
drawText("We are gathering again.", rect: NSRect(x: card.minX + 64, y: card.maxY - 220, width: 750, height: 84), font: NSFont(name: "Georgia", size: 56) ?? NSFont.systemFont(ofSize: 56), color: color(0x17191f), alignment: .left, lineHeight: 62)
drawText("Please mark your calendars for the Hayes Family Reunion. We are planning a meaningful weekend to reconnect, honor our legacy, and make new memories together.", rect: NSRect(x: card.minX + 64, y: card.maxY - 385, width: 760, height: 118), font: NSFont.systemFont(ofSize: 27), color: color(0x232a34), alignment: .left, lineHeight: 37)
drawText("More details about lodging, activities, meals, and registration will be shared soon.", rect: NSRect(x: card.minX + 64, y: card.minY + 62, width: 760, height: 78), font: NSFont.boldSystemFont(ofSize: 26), color: color(0xd96324), alignment: .left, lineHeight: 34)

let detailX = detailPanel.minX + 42
drawText("WHEN", rect: NSRect(x: detailX, y: detailPanel.maxY - 84, width: 300, height: 32), font: NSFont.boldSystemFont(ofSize: 23), color: orange, alignment: .left, kern: 1.2)
drawText("Aug. 31 - Sept. 3,\n2028", rect: NSRect(x: detailX, y: detailPanel.maxY - 182, width: 310, height: 95), font: NSFont.boldSystemFont(ofSize: 42), color: white, alignment: .left, lineHeight: 46)
drawText("WHERE", rect: NSRect(x: detailX, y: detailPanel.maxY - 254, width: 300, height: 32), font: NSFont.boldSystemFont(ofSize: 23), color: orange, alignment: .left, kern: 1.2)
drawText("Charleston,\nSouth Carolina", rect: NSRect(x: detailX, y: detailPanel.maxY - 364, width: 320, height: 105), font: NSFont.boldSystemFont(ofSize: 38), color: white, alignment: .left, lineHeight: 43)
drawText("THEME", rect: NSRect(x: detailX, y: detailPanel.minY + 82, width: 300, height: 32), font: NSFont.boldSystemFont(ofSize: 23), color: orange, alignment: .left, kern: 1.2)
drawText("Honoring Our Legacy.\nCelebrating Our Family.\nBuilding Our Future.", rect: NSRect(x: detailX, y: detailPanel.minY + 18, width: 310, height: 72), font: NSFont.boldSystemFont(ofSize: 20), color: white, alignment: .left, lineHeight: 24)

NSGraphicsContext.restoreGraphicsState()

if let data = bitmap.representation(using: .png, properties: [:]) {
    try data.write(to: outputURL)
    print(outputURL.path)
}
