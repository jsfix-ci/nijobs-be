import Company  from "../models/Company.js";
import Offer  from "../models/Offer.js";
import Account  from "../models/Account.js";
import EmailService  from "../lib/emailService.js";
import { OFFER_DISABLED_NOTIFICATION }  from "../email-templates/companyOfferDisabled.js";
import OfferConstants  from "../models/constants/Offer.js";

class OfferService {
    // TODO: Use typedi or similar
    constructor() {

    }

    static get MAX_OFFERS_PER_QUERY() {
        return 20;
    }

    async create({
        title,
        publishDate = new Date(Date.now()),
        publishEndDate,
        jobMinDuration,
        jobMaxDuration,
        jobStartDate,
        description,
        contacts,
        isPaid,
        vacancies,
        jobType,
        fields,
        technologies,
        isHidden,
        owner,
        location,
        coordinates,
        requirements,
    }) {

        const { name: ownerName, logo: ownerLogo } = await Company.findById(owner);
        const offer = await Offer.create({
            title,
            publishDate,
            publishEndDate,
            jobMinDuration,
            jobMaxDuration,
            jobStartDate,
            description,
            contacts,
            isPaid,
            vacancies,
            jobType,
            fields,
            technologies,
            isHidden,
            owner,
            ownerName,
            ownerLogo,
            location,
            coordinates,
            requirements
        });
        return offer;
    }

    async edit(
        _id,
        {
            title,
            publishDate,
            publishEndDate,
            jobMinDuration,
            jobMaxDuration,
            jobStartDate,
            description,
            contacts,
            isPaid,
            vacancies,
            jobType,
            fields,
            technologies,
            location,
            coordinates,
            requirements,
        }) {
        const edits = {
            title,
            publishDate,
            publishEndDate,
            jobMinDuration,
            jobMaxDuration,
            jobStartDate,
            description,
            contacts,
            isPaid,
            vacancies,
            jobType,
            fields,
            technologies,
            location,
            coordinates,
            requirements,
        };
        const offer = await Offer.findOneAndUpdate(
            { _id },
            edits,
            { new: true, omitUndefined: true },
            (err) => {
                if (err) {
                    throw err;
                }
            }
        );

        return offer;
    }

    async disable(
        _id,
        hiddenReason,
        adminReason
    ) {
        const offer = await Offer.findOneAndUpdate(
            { _id },
            {
                isHidden: true,
                hiddenReason,
                adminReason
            },
            { new: true },
            (err) => {
                if (err) {
                    throw err;
                }
            }
        );
        return offer;
    }

    async enable(
        _id
    ) {
        const query = { _id };
        const offer = await Offer.findOneAndUpdate(
            query,
            {
                isHidden: false,
                $unset: { hiddenReason: undefined, adminReason: undefined }, // Removing property from document.
            },
            { new: true },
            (err) => {
                if (err) {
                    throw err;
                }
            }
        );
        return offer;
    }

    _hideByCompany(owner, reason) {
        return Offer.updateMany(
            { owner, isHidden: false },
            {
                isHidden: true,
                hiddenReason: reason,
            });
    }

    _unhideByCompany(owner, reason) {
        return Offer.updateMany(
            { owner, isHidden: true, hiddenReason: reason },
            {
                isHidden: false,
                $unset: { hiddenReason: undefined, adminReason: undefined },
            });
    }

    blockByCompany(owner) {
        return this._hideByCompany(owner, OfferConstants.HiddenOfferReasons.COMPANY_BLOCKED);
    }

    unblockByCompany(owner) {
        return this._unhideByCompany(owner, OfferConstants.HiddenOfferReasons.COMPANY_BLOCKED);
    }

    disableByCompany(owner) {
        return this._hideByCompany(owner, OfferConstants.HiddenOfferReasons.COMPANY_DISABLED);
    }

    enableByCompany(owner) {
        return this._unhideByCompany(owner, OfferConstants.HiddenOfferReasons.COMPANY_DISABLED);
    }

    /**
     * Fetches offers according to specified options
     * @param {*} options
     * value: Text to use in full-text-search
     * offset: Point to start looking (and limiting)
     * limit: How many offers to show
     * jobType: Array of jobTypes allowed
     */
    get({ value = "", offset = 0, limit = OfferService.MAX_OFFERS_PER_QUERY, showHidden = false, showAdminReason = false, ...filters }) {

        const offers = (value ? Offer.find(
            { "$and": [this._buildFilterQuery(filters), { "$text": { "$search": value } }] }, { score: { "$meta": "textScore" } }
        ) : Offer.find(this._buildFilterQuery(filters))).current();

        if (!showHidden) offers.withoutHidden();

        const offersQuery = offers
            .sort(value ? { score: { "$meta": "textScore" } } : undefined)
            .skip(offset)
            .limit(limit)
        ;

        return showAdminReason ? offersQuery : offersQuery.select("-adminReason");

    }
    _buildFilterQuery(filters) {
        if (!filters || !Object.keys(filters).length) return {};

        const { jobType, jobMinDuration, jobMaxDuration, fields, technologies } = filters;
        const constraints = [];

        if (jobType) constraints.push({ jobType: { "$in": jobType } });
        if (jobMinDuration) {
            constraints.push({
                "$or": [
                    { jobMinDuration: { "$exists": false } },
                    { jobMinDuration: { "$gte": jobMinDuration } },
                    {
                        "$and": [
                            { jobMinDuration: { "$lt": jobMinDuration } },
                            { "$or": [
                                { jobMaxDuration: { "$exists": false } },
                                { jobMaxDuration: { "$gte": jobMinDuration } },
                            ] }
                        ]
                    },
                ]
            });
        }
        if (jobMaxDuration) {
            constraints.push({
                "$or": [
                    { jobMaxDuration: { "$exists": false } },
                    { jobMaxDuration: { "$lte": jobMaxDuration } },
                    {
                        "$and": [
                            { jobMaxDuration: { "$gt": jobMaxDuration } },
                            { "$or": [
                                { jobMinDuration: { "$exists": false } },
                                { jobMinDuration: { "$lte": jobMaxDuration } },
                            ] }
                        ]
                    },
                ]
            });
        }
        if (fields?.length) constraints.push({ fields: {  "$elemMatch": { "$in": fields } } });
        if (technologies?.length) constraints.push({ technologies: {  "$elemMatch": { "$in": technologies } } });

        return constraints.length ? { "$and": constraints } : {};
    }

    /**
     * Checks whether a given offer is visible to a specific userCompanyId.
     * Unpublished/Unactive offers may still be visible
     * @param {*} offer
     * @param {*} hasAdminPrivileges
     * @param {*} userCompanyId
     * @returns true if the offer is visible, false otherwise
     */
    isVisibleOffer(offer, hasAdminPrivileges, userCompanyId = "") {
        return !offer?.isHidden || hasAdminPrivileges || (offer.owner.toString() === userCompanyId.toString());
    }

    async getOfferById(offerId, targetOwner, hasAdminPrivileges, showAdminReason = false) {
        const offerQuery = Offer.findById(offerId);

        if (!showAdminReason) offerQuery.select("-adminReason");

        const offer = await offerQuery;

        if (!this.isVisibleOffer(offer, hasAdminPrivileges, targetOwner)) return null;

        return offer;
    }

    /**
     * Gets all the offers from a specific company that are visible to a specific user
     * Note: This function will show even unpublished/unactive offers
     * @param {*} companyId
     * @param {*} userCompanyId
     * @param {*} hasAdminPrivileges
     * @returns Visible offers
     */
    async getOffersByCompanyId(companyId, userCompanyId, hasAdminPrivileges, filters) {
        return (await Offer.find({ owner: companyId }, null, filters.filter))
            .filter((offer) =>
                this.isVisibleOffer(offer, hasAdminPrivileges, userCompanyId)
            );
    }

    async sendOfferDisabledNotification(offerId) {
        const offer = await Offer.findById(offerId);
        if (!offer) return;  // validation of offerId should be done before with an error

        const companyAccount = await Account.findOne({
            company: await Company.findOne({ _id: offer.owner })
        });

        await EmailService.sendMail({
            to: companyAccount.email,
            ...OFFER_DISABLED_NOTIFICATION(offer.ownerName, offer.title, offer.description),
        });
    }

    async deleteOffersByCompanyId(companyId) {
        await Offer.deleteMany({ owner: companyId });
    }

}

export default OfferService;
