const router = require('express').Router();
const requireAuth /*requireRole*/ = require('../middleware/requireAuth');
const {
    getRevisions,
    getDiff,
    revertRevision
} = require('../controllers/revisionController');

router.use(requireAuth);
//const translatorRouter = express.Router();

// View history
router.get('/revisions/:id', getRevisions);

// Compute diff
router.get('/diff/:id/:revIndex', getDiff);

// Revert the translation
router.post('/revert/:id/:revIndex', revertRevision);

//router.use('/', requireRole('Translator'), translatorRouter);

module.exports = router;