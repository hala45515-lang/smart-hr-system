const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Streams a simple tabular report as an .xlsx file.
 * columns: [{ header, key, width }], rows: [{ ...key: value }]
 */
const sendExcel = async (res, filename, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Streams a simple tabular report as a .pdf file (title + column headers + rows).
 * columns: [{ header, key, width }], rows: [{ ...key: value }]
 */
const sendPdfTable = (res, filename, title, columns, rows) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(title, { align: 'center' });
  doc.moveDown();

  const startX = doc.page.margins.left;
  let y = doc.y;
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / columns.length;

  doc.fontSize(10).font('Helvetica-Bold');
  columns.forEach((col, i) => doc.text(String(col.header), startX + i * colWidth, y, { width: colWidth }));
  y += 18;
  doc.moveTo(startX, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
  y += 6;

  doc.font('Helvetica');
  rows.forEach((row) => {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    columns.forEach((col, i) => doc.text(String(row[col.key] ?? ''), startX + i * colWidth, y, { width: colWidth }));
    y += 16;
  });

  doc.end();
};

/**
 * Streams a formatted monthly payslip as a .pdf file.
 */
const sendPayslipPdf = (res, { employeeName, employeeCode, position, department }, payroll) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${payroll.year}-${payroll.month}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text('Smart HR System', { align: 'center' });
  doc.fontSize(14).text('Payslip', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(11);
  doc.text(`Employee: ${employeeName}`);
  doc.text(`Employee Code: ${employeeCode}`);
  doc.text(`Position: ${position || '-'}`);
  doc.text(`Department: ${department || '-'}`);
  doc.text(`Period: ${payroll.month}/${payroll.year}`);
  doc.moveDown();

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  const line = (label, value) => {
    doc.text(label, 50, doc.y, { continued: true, width: 300 });
    doc.text(String(value), { align: 'right' });
  };

  line('Base Salary', payroll.baseSalary.toFixed(2));
  if (payroll.absentDays) line(`Attendance Deduction (${payroll.absentDays} absent day(s))`, `- ${payroll.attendanceDeduction.toFixed(2)}`);
  line('Bonuses', `+ ${Number(payroll.bonuses).toFixed(2)}`);
  line('Deductions', `- ${Number(payroll.deductions).toFixed(2)}`);
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  doc.fontSize(13).font('Helvetica-Bold');
  line('Net Salary', payroll.netSalary.toFixed(2));

  doc.end();
};

module.exports = { sendExcel, sendPdfTable, sendPayslipPdf };
