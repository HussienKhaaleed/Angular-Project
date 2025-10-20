//bookingController.js
const Stripe = require("stripe");
const BookingModel = require("../models/bookingModel");
const MovieModel = require("../models/moviesModel");
const UserModel = require("../models/usersModel");

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // throw an informative error when used (not at module load time)
    throw new Error(
      "Missing STRIPE_SECRET_KEY environment variable. Set it in .env.",
    );
  }
  return Stripe(key);
}

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { movieId, ticketsCount, showTime } = req.body;

    if (!movieId || !ticketsCount || !showTime) {
      return res.status(400).json({
        status: "fail",
        message: "movieId, ticketsCount and showTime are required",
      });
    }

    const movie = await MovieModel.findById(movieId);
    if (!movie)
      return res
        .status(404)
        .json({ status: "fail", message: "Movie not found" });

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      customer_email: req.user.email,
      client_reference_id: movieId,
      line_items: [
        {
          price_data: {
            currency: "egp",
            product_data: {
              name: movie.title,
              images: [
                `${req.protocol}://${req.get("host")}/moviePosters/${
                  movie.posterImage
                }`,
              ],
            },
            unit_amount: movie.price * 100, // amount in *piasters*
          },
          quantity: ticketsCount,
        },
      ],
      metadata: {
        userId: req.user._id.toString(),
        ticketsCount: ticketsCount.toString(),
        showTime: showTime.toString(),
      },
    });

    res.status(200).json({
      status: "success",
      sessionUrl: session.url,
    });
  } catch (err) {
    next(err);
  }
};

//Get webhook from stripe when payment is successful
//Create bookings in DB

exports.handleStripeWebhook = async (req, res) => {
  let event;
  try {
    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    console.log("Webhook verified:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const userId = metadata.userId;
      const movieId = session.client_reference_id;
      const ticketsCount = metadata.ticketsCount
        ? Number(metadata.ticketsCount)
        : 1;
      const showTime = metadata.showTime
        ? new Date(metadata.showTime)
        : new Date();
      const amountPaid = session.amount_total / 100;

      const user = await UserModel.findById(userId);
      if (!user) {
        console.error("User not found for webhook session:", userId);
        return res.status(400).send("User not found");
      }

      const movie = await MovieModel.findById(movieId);
      if (!movie) {
        console.error("Movie not found for webhook session:", movieId);
        return res.status(400).send("Movie not found");
      }

      const existingBooking = await BookingModel.findOne({
        user: user._id,
        movie: movie._id,
        amountPaid,
      });

      if (existingBooking) {
        console.log("Duplicate booking ignored");
        return res.status(200).json({ received: true });
      }

      await BookingModel.create({
        user: user._id,
        movie: movie._id,
        showTime,
        ticketsCount,
        amountPaid,
        paymentStatus: "paid",
      });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Error processing webhook event:", err);
    res.status(400).send(`Webhook Internal Error: ${err.message}`);
  }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await BookingModel.find({ user: req.user._id });
    res.status(200).json({
      status: "success",
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
};
