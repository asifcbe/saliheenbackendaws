const router = require('express').Router();
const { getBranches, getAllBranchesAdmin, createBranch, updateBranch, deleteBranch } = require('../controllers/branchController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getBranches);
router.get('/admin/all', protect, adminOnly, getAllBranchesAdmin);
router.post('/', protect, adminOnly, createBranch);
router.put('/:id', protect, adminOnly, updateBranch);
router.delete('/:id', protect, adminOnly, deleteBranch);

module.exports = router;
