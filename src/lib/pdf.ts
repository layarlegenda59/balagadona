import { jsPDF } from 'jspdf'
import { OrderData } from '../types'
import { formatPrice } from '../constants/products'
import logoImage from '../assets/Logo Balagadona_fix.png'

async function getMonochromeLogo(src: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve({ dataUrl: src, width: img.width, height: img.height })
        return
      }
      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        // Convert to grayscale
        const gray = 0.299 * r + 0.587 * g + 0.114 * b
        data[i] = gray
        data[i + 1] = gray
        data[i + 2] = gray
      }
      ctx.putImageData(imgData, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.width, height: img.height })
    }
    img.onerror = () => {
      reject(new Error('Failed to load logo image'))
    }
    img.src = src
  })
}

export async function generateReceiptPDF(order: OrderData) {
  // Load logo and calculate aspect ratio
  let logoDataUrl = ''
  let logoHeight = 0
  const logoWidth = 18 // 18mm width

  try {
    const logoResult = await getMonochromeLogo(logoImage)
    logoDataUrl = logoResult.dataUrl
    const aspectRatio = logoResult.width / logoResult.height
    logoHeight = logoWidth / aspectRatio
  } catch (err) {
    console.error('Failed to load or convert logo for PDF:', err)
  }

  // 1. Calculate dynamic height based on text content
  const tempDoc = new jsPDF()
  tempDoc.setFont('Courier', 'normal')
  tempDoc.setFontSize(8)

  const addressLines = tempDoc.splitTextToSize(order.customer.address, 70)
  const notes = order.customer.notes || ''
  const noteLines = notes ? tempDoc.splitTextToSize(notes, 70) : []

  // Base height calculation (in mm)
  let estimatedHeight = 10 // top margin
  if (logoHeight > 0) {
    estimatedHeight += logoHeight + 4 // Add logo height and margin
  }
  estimatedHeight += 6     // Shop Name
  estimatedHeight += 4     // Tagline
  estimatedHeight += 4     // City/Region
  estimatedHeight += 4     // Divider

  // Meta Info: 5 lines * 4.5mm + divider
  estimatedHeight += 24
  
  // Address block
  estimatedHeight += 5     // Header
  estimatedHeight += addressLines.length * 4
  estimatedHeight += 4     // Divider

  // Notes block
  if (notes) {
    estimatedHeight += 5   // Header
    estimatedHeight += noteLines.length * 4
    estimatedHeight += 4   // Divider
  }

  // Items block
  estimatedHeight += 5     // Header
  order.items.forEach(() => {
    estimatedHeight += 8.5 // Name (4mm) + Qty/Price line (4.5mm)
  })
  estimatedHeight += 4     // Divider

  // Total block
  const hasShipping = order.deliveryFee !== undefined
  if (hasShipping) {
    estimatedHeight += 9.0 // Subtotal & Ongkir lines (4.5mm each)
  }
  estimatedHeight += 6     // Total price line
  estimatedHeight += 4     // Divider

  // Footer block
  estimatedHeight += 16    // Thank you text lines
  estimatedHeight += 8     // Bottom padding

  const pageHeight = Math.max(130, estimatedHeight)

  // 2. Create the real thermal receipt document
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, pageHeight]
  })

  // Set default styles (monochrome black)
  doc.setFont('Courier', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(0, 0, 0)

  let curY = 8
  const divider = '----------------------------------------'

  // Draw Logo
  if (logoDataUrl && logoHeight > 0) {
    doc.addImage(logoDataUrl, 'PNG', 40 - logoWidth / 2, curY, logoWidth, logoHeight)
    curY += logoHeight + 4
  }

  // Header Banner
  doc.setFont('Courier', 'bold')
  doc.setFontSize(11)
  doc.text('BATAGOR BALAGADONA', 40, curY, { align: 'center' })
  curY += 5

  doc.setFont('Courier', 'normal')
  doc.setFontSize(7.5)
  doc.text('Batagor Enak, Pesan Cepat, Antar Tepat', 40, curY, { align: 'center' })
  curY += 4
  doc.text('Kota Cimahi, Jawa Barat', 40, curY, { align: 'center' })
  curY += 4

  doc.text(divider, 40, curY, { align: 'center' })
  curY += 4

  // Order Info
  doc.text(`ID PESANAN : ${order.id}`, 5, curY)
  curY += 4.5

  const dateText = order.createdAt
    ? `${new Date(order.createdAt).toLocaleDateString('id-ID')} ${new Date(order.createdAt).toLocaleTimeString('id-ID')}`
    : '-'
  doc.text(`TANGGAL    : ${dateText}`, 5, curY)
  curY += 4.5

  doc.text(`PELANGGAN  : ${order.customer.name.toUpperCase()}`, 5, curY)
  curY += 4.5
  doc.text(`WHATSAPP   : ${order.customer.phone}`, 5, curY)
  curY += 4.5
  doc.text(`KIRIM      : ${order.customer.deliveryTime.toUpperCase()}`, 5, curY)
  curY += 4

  doc.text(divider, 40, curY, { align: 'center' })
  curY += 4

  // Delivery Address
  doc.setFont('Courier', 'bold')
  doc.text('ALAMAT PENGIRIMAN:', 5, curY)
  curY += 4.5

  doc.setFont('Courier', 'normal')
  addressLines.forEach((line: string) => {
    doc.text(line, 5, curY)
    curY += 4
  })

  doc.text(divider, 40, curY, { align: 'center' })
  curY += 4

  // Customer Notes
  if (notes) {
    doc.setFont('Courier', 'bold')
    doc.text('CATATAN PESANAN:', 5, curY)
    curY += 4.5

    doc.setFont('Courier', 'normal')
    noteLines.forEach((line: string) => {
      doc.text(line, 5, curY)
      curY += 4
    })

    doc.text(divider, 40, curY, { align: 'center' })
    curY += 4
  }

  // Items Ordered
  doc.setFont('Courier', 'bold')
  doc.text('RINCIAN PESANAN:', 5, curY)
  curY += 4.5

  doc.setFont('Courier', 'normal')
  order.items.forEach((item) => {
    // Row 1: Item Name
    doc.text(item.product.name.toUpperCase(), 5, curY)
    curY += 4

    // Row 2: Qty x Unit Price & Subtotal
    const qtyPriceStr = `  ${item.quantity} x ${formatPrice(item.product.price)}`
    const subtotalStr = formatPrice(item.product.price * item.quantity)
    doc.text(qtyPriceStr, 5, curY)
    doc.text(subtotalStr, 75, curY, { align: 'right' })
    curY += 4.5
  })

  doc.text(divider, 40, curY, { align: 'center' })
  curY += 4

  // Total
  doc.setFont('Courier', 'bold')
  doc.setFontSize(7.5)
  if (order.deliveryFee !== undefined) {
    const subtotal = order.total - order.deliveryFee
    doc.text('SUBTOTAL:', 5, curY)
    doc.text(formatPrice(subtotal), 75, curY, { align: 'right' })
    curY += 4.5
    
    const distText = order.deliveryDistance ? ` (${order.deliveryDistance})` : ''
    doc.text(`ONGKOS KIRIM${distText.toUpperCase()}:`, 5, curY)
    const feeText = order.deliveryFee === 0 ? 'GRATIS' : formatPrice(order.deliveryFee)
    doc.text(feeText, 75, curY, { align: 'right' })
    curY += 4.5
  }

  doc.setFontSize(9)
  doc.text('TOTAL BAYAR:', 5, curY)
  doc.text(formatPrice(order.total), 75, curY, { align: 'right' })
  curY += 5

  doc.setFont('Courier', 'normal')
  doc.setFontSize(7.5)
  doc.text(divider, 40, curY, { align: 'center' })
  curY += 4.5

  // Footer Message
  doc.text('Terima kasih atas pesanan Anda!', 40, curY, { align: 'center' })
  curY += 4
  doc.text('Segera diproses & dikirim hangat.', 40, curY, { align: 'center' })
  curY += 4
  doc.setFont('Courier', 'bold')
  doc.text('=== BATAGOR BALAGADONA ===', 40, curY, { align: 'center' })

  // Save the receipt
  doc.save(`struk-balagadona-${order.id}.pdf`)
}
