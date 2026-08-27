const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Document = require('../models/Document');
const Payroll = require('../models/Payroll');
const { resolveEmployeeId } = require('../utils/resolveEmployee');

const REQUIRED_DOC_TYPES = ['contract', 'id'];

// @desc  Employee Vault — all documents in one place
// @route GET /api/vault/:employeeId?
const listDocuments = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const documents = await Document.find({ employee: employeeId }).sort({ createdAt: -1 });

  const missingTypes = REQUIRED_DOC_TYPES.filter((t) => !documents.some((d) => d.type === t));

  let daysUntilContractExpiry = null;
  const contract = documents.find((d) => d.type === 'contract' && d.expiryDate);
  if (contract) {
    daysUntilContractExpiry = Math.ceil((contract.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  }

  ok(res, { documents, missingTypes, daysUntilContractExpiry });
});

// @desc  Upload a document into the vault (an employee can upload their own; HR/manager can upload on any employee's behalf)
// @route POST /api/vault/:employeeId?
const uploadDocument = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const { type, title, issueDate, expiryDate } = req.body;
  if (!type || !title) throw new ApiError(400, 'type and title are required');
  if (!req.file) throw new ApiError(400, 'file is required');

  const document = await Document.create({
    employee: employeeId,
    type,
    title,
    fileUrl: `/uploads/documents/${req.file.filename}`,
    issueDate,
    expiryDate,
    uploadedBy: req.user._id,
  });

  created(res, document, 'Document uploaded');
});

// @desc  Salary history / comparison across years, powered by payroll records
// @route GET /api/vault/:employeeId?/salary-history
const getSalaryHistory = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const filter = { employee: employeeId };
  if (req.user.role === 'employee') filter.status = 'approved';
  const records = await Payroll.find(filter).sort({ year: 1, month: 1 });

  const byYear = {};
  records.forEach((r) => {
    byYear[r.year] = byYear[r.year] || [];
    byYear[r.year].push(r.netSalary);
  });

  const yearlyAverages = Object.entries(byYear).map(([year, salaries]) => ({
    year: Number(year),
    averageNetSalary: Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length),
  }));

  const growth = yearlyAverages.map((entry, idx) => {
    if (idx === 0) return { ...entry, changePercent: 0 };
    const prev = yearlyAverages[idx - 1].averageNetSalary;
    const changePercent = prev ? Math.round(((entry.averageNetSalary - prev) / prev) * 1000) / 10 : 0;
    return { ...entry, changePercent };
  });

  ok(res, { records, yearlyAverages: growth });
});

// @desc  HR reviews an uploaded document — mark it approved or rejected
// @route PATCH /api/vault/document/:documentId/review
const reviewDocument = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!['approved', 'rejected'].includes(status)) throw new ApiError(400, "status must be 'approved' or 'rejected'");

  const document = await Document.findByIdAndUpdate(
    req.params.documentId,
    { status, reviewNote: note, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  );
  if (!document) throw new ApiError(404, 'Document not found');
  ok(res, document, `Document ${status}`);
});

// @desc  Delete a document
// @route DELETE /api/vault/document/:documentId
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findByIdAndDelete(req.params.documentId);
  if (!document) throw new ApiError(404, 'Document not found');
  ok(res, null, 'Document deleted');
});

module.exports = { listDocuments, uploadDocument, getSalaryHistory, reviewDocument, deleteDocument };
