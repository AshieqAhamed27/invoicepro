const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
    protect
} = require('../middleware/auth');

const router = express.Router();

// ==========================
// TOKEN
// ==========================
const generateToken = (id) => {
    return jwt.sign({ id },
        process.env.JWT_SECRET ||
        'fallback_secret', {
            expiresIn: '30d'
        }
    );
};

// ==========================
// SIGNUP
// ==========================
router.post(
    '/signup',
    async(req, res) => {
        try {
            const {
                name,
                email,
                password,
                companyName
            } = req.body;

            if (!name ||
                !email ||
                !password
            ) {
                return res
                    .status(400)
                    .json({
                        message: 'Please provide name, email, and password.'
                    });
            }

            const existingUser =
                await User.findOne({
                    email
                });

            if (existingUser) {
                return res
                    .status(400)
                    .json({
                        message: 'Email already registered.'
                    });
            }

            const user =
                await User.create({
                    name,
                    email,
                    password,
                    companyName
                });

            res.status(201).json({
                message: 'Account created successfully!',
                token: generateToken(
                    user._id
                ),
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    plan: user.plan,
                    companyName: user.companyName,
                    gstNumber: user.gstNumber,
                    upiId: user.upiId,
                    address: user.address,
                    logo: user.logo
                }
            });

        } catch (err) {
            console.error(
                'SIGNUP ERROR:',
                err
            );

            res.status(500).json({
                message: 'Server error. Please try again.'
            });
        }
    }
);

// ==========================
// LOGIN
// ==========================
router.post(
    '/login',
    async(req, res) => {
        try {
            const {
                email,
                password
            } = req.body;

            if (!email ||
                !password
            ) {
                return res
                    .status(400)
                    .json({
                        message: 'Please provide email and password.'
                    });
            }

            const user =
                await User.findOne({
                    email
                });

            if (!user) {
                return res
                    .status(401)
                    .json({
                        message: 'User not found'
                    });
            }

            const isMatch =
                await user.comparePassword(
                    password
                );

            if (!isMatch) {
                return res
                    .status(401)
                    .json({
                        message: 'Invalid password'
                    });
            }

            res.json({
                message: 'Login successful!',
                token: generateToken(
                    user._id
                ),
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    plan: user.plan,
                    companyName: user.companyName,
                    gstNumber: user.gstNumber,
                    upiId: user.upiId,
                    address: user.address,
                    logo: user.logo
                }
            });

        } catch (err) {
            console.error(
                'LOGIN ERROR:',
                err
            );

            res.status(500).json({
                message: 'Server error. Please try again.'
            });
        }
    }
);

// ==========================
// GOOGLE LOGIN
// ==========================
router.post(
    '/google',
    async(req, res) => {
        try {
            const {
                name,
                email
            } = req.body;

            let user =
                await User.findOne({
                    email
                });

            if (!user) {
                user =
                    await User.create({
                        name,
                        email,
                        password: Math.random()
                            .toString(36)
                    });
            }

            res.json({
                token: generateToken(
                    user._id
                ),
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    plan: user.plan,
                    companyName: user.companyName,
                    gstNumber: user.gstNumber,
                    upiId: user.upiId,
                    address: user.address,
                    logo: user.logo
                }
            });

        } catch {
            res.status(500).json({
                message: 'Google login failed'
            });
        }
    }
);

// ==========================
// GET CURRENT USER
// ==========================
router.get(
    '/me',
    protect,
    (req, res) => {
        res.json({
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                plan: req.user.plan,
                companyName: req.user.companyName,
                gstNumber: req.user.gstNumber,
                upiId: req.user.upiId,
                address: req.user.address,
                logo: req.user.logo
            }
        });
    }
);

// ==========================
// UPDATE PROFILE / SETTINGS
// ==========================
router.put(
    '/profile',
    protect,
    async(req, res) => {
        try {
            const {
                companyName,
                gstNumber,
                upiId,
                address,
                logo
            } = req.body;

            req.user.companyName =
                companyName ||
                req.user.companyName;

            req.user.gstNumber =
                gstNumber ||
                req.user.gstNumber;

            req.user.upiId =
                upiId ||
                req.user.upiId;

            req.user.address =
                address ||
                req.user.address;

            req.user.logo =
                logo ||
                req.user.logo;

            await req.user.save();

            res.json({
                message: 'Profile updated',
                user: {
                    id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                    plan: req.user.plan,
                    companyName: req.user.companyName,
                    gstNumber: req.user.gstNumber,
                    upiId: req.user.upiId,
                    address: req.user.address,
                    logo: req.user.logo
                }
            });

        } catch (err) {
            console.error(
                'PROFILE UPDATE ERROR:',
                err
            );

            res.status(500).json({
                message: 'Server error.'
            });
        }
    }
);

// ==========================
// UPGRADE TO PRO
// ==========================
router.put(
    '/upgrade',
    protect,
    async(req, res) => {
        try {
            req.user.plan =
                'pro';

            await req.user.save();

            res.json({
                message: 'Upgraded to Pro!',
                plan: 'pro'
            });

        } catch (err) {
            console.error(
                'UPGRADE ERROR:',
                err
            );

            res.status(500).json({
                message: 'Server error.'
            });
        }
    }
);

module.exports = router;