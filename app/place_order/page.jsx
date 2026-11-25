"use client";
import { useContext, useEffect, useState } from "react";
import { CartContext } from "../contexts/CartContext";
import { user_auth } from "../helpers/helper";
import Link from "next/link";
import { session, session_destroy } from "../helpers/SessionHelper";
import withUserAuth from "../hoc/withUserAuth";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import ImageWithFallback from "../_components/ImageWithFallback";

const PlaceOrder = () => {
    const router = useRouter();
    const { cart, setCart } = useContext(CartContext);
    const [subTotal, setSubTotal] = useState(0);
    const [isDisabled, setIsDisabled] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
    const [billingCity, setBillingCity] = useState("");
    const [billingPostcode, setBillingPostcode] = useState("");
    const [billingErrors, setBillingErrors] = useState({});
    const restaurantGroups = cart.reduce((groups, item) => {
        const key = item.restaurant_id || "restaurant";
        if (!groups[key]) {
            groups[key] = { name: item.restaurant_name || "Restaurant", total: 0, items: 0 };
        }
        groups[key].total += Number(item.price) * Number(item.quantity);
        groups[key].items += Number(item.quantity);
        return groups;
    }, {});
    const restaurantCount = Object.keys(restaurantGroups).length;
    const calculateSubTotal = () => {
        const total = cart.reduce((total, item) => total + (item.quantity * item.price), 0);
        return total;
    }
    useEffect(() => {
        setSubTotal(calculateSubTotal());
    }, [cart]);

    useEffect(() => {
        const url = new URL(window.location.href);
        const paymentResult = url.searchParams.get("payment");
        if (!paymentResult) return;

        url.searchParams.delete("payment");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        if (paymentResult === "success") {
            session_destroy("cart");
            setCart([]);
            toast.success("Payment successful. Your order has been placed.");
        } else if (paymentResult === "cancelled") {
            toast.info("Payment was cancelled. Your cart is ready to try again.");
        } else if (paymentResult === "failed") {
            toast.error("Payment was not completed. Your cart is ready to try again.");
        } else if (paymentResult === "verification_error") {
            toast.error("We could not confirm the payment yet. Please contact support before retrying.");
        } else if (paymentResult === "verification_failed") {
            toast.error("Payment could not be verified. Your cart is ready to try again.");
        }
    }, [setCart]);

    const removeFromCart = (id) => {
        const cartItems = cart.filter(item => item._id !== id);
        if (cartItems.length > 0) {
            session('cart', cartItems);
        }
        else {
            session_destroy('cart');
        }

        setCart(cartItems);
        toast.success("Item has been removed.");
    }

    const quantityChange = (item, newQty) => {
        const quantity = Number(newQty);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
        const cartItems = cart.map((row) => row._id === item._id ? { ...row, quantity } : row);
        session('cart', cartItems);
        setCart(cartItems);
    }

    const increaseQty = (item) => {
        const cartItems = cart.map((row) => row._id === item._id && row.quantity < 99
            ? { ...row, quantity: row.quantity + 1 }
            : row);
        session('cart', cartItems);
        setCart(cartItems);
    }

    const decreaseQty = (item) => {
        const cartItems = cart.map((row) => row._id === item._id && row.quantity > 1
            ? { ...row, quantity: row.quantity - 1 }
            : row);
        session('cart', cartItems);
        setCart(cartItems);
    }

    const orderSubmit = async () => {
        if (paymentMethod === "sslcommerz") {
            const errors = {};
            if (billingCity.trim().length < 2 || billingCity.trim().length > 100) {
                errors.city = "Enter a city name between 2 and 100 characters.";
            }
            if (!/^\d{4,10}$/.test(billingPostcode.trim())) {
                errors.postcode = "Enter a postcode with 4 to 10 digits.";
            }
            setBillingErrors(errors);
            if (Object.keys(errors).length > 0) return;
        }
        setIsDisabled(true);
        let data = {
            "user_id": user_auth()._id,
            "total": subTotal,
            "items": [],
            "payment_method": paymentMethod,
            "billing_city": billingCity,
            "billing_postcode": billingPostcode,
        };

        cart.map(item => {
            data.items.push({
                "id": item._id,
                "quantity": item.quantity,
                "price": item.price,
                "restaurant_id": item.restaurant_id,
            })
        });

        try {
            const response = await fetch("/api/v1/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                toast.error(result.message || "Unable to place this order.");
                return;
            }
            if (result.payment_required && result.redirect_url) {
                window.location.assign(result.redirect_url);
                return;
            }
            session_destroy('cart');
            setCart([]);
            toast.success(result.message);
            router.push('/user/dashboard');
        } catch (error) {
            console.error("Order placement failed:", error);
            toast.error("Unable to place this order.");
        } finally {
            setIsDisabled(false);
        }
    }
    return (
        <div>
            <div className="restaurant-page-banner">
                <h1>Place Order</h1>
            </div>
            <div className="food-list-wrapper">
                {
                    cart.length > 0 && (<h4 className="ml-3">Foods Information</h4>)
                }
                {
                    cart.length > 0 ? cart.map((item) => (
                        <article className="cart-item-card" key={item._id}>
                            <ImageWithFallback src={item.image} alt={item.name} />
                            <div className="cart-item-details">
                                <h2>{item.name}</h2>
                                <p>Tk {Number(item.price).toFixed(2)} each</p>
                                <div className="cart-quantity">
                                    <button aria-label={`Decrease ${item.name} quantity`} onClick={() => decreaseQty(item)}>-</button>
                                    <input type="number" min="1" max="99" value={item.quantity} aria-label={`${item.name} quantity`} className="onlyNumber" onChange={(e) => quantityChange(item, e.target.value)} />
                                    <button aria-label={`Increase ${item.name} quantity`} onClick={() => increaseQty(item)}>+</button>
                                </div>
                                <button className="remove_button" onClick={() => removeFromCart(item._id)}>Remove</button>
                            </div>
                            <strong className="cart-item-total">Tk {(item.price * item.quantity).toFixed(2)}</strong>
                        </article>
                    ))
                        : (<h1 className="text-center text-red-600">Your cart is empty!</h1>)
                }
                {
                    cart.length > 0 &&
                    (<div>

                        <div className="ml-3 mt-3 mb-3">
                            <h4>Shipping Information</h4>
                            <p><b>Address:</b> {user_auth()?.address || "Add an address in your profile."}</p>
                            <p><b>Phone:</b> {user_auth()?.phone || "Add a phone number in your profile."}</p>
                        </div>
                        <hr />
                        <div className="ml-3 mt-3 mb-3">
                            <h4>Payment Method</h4>
                            <div className="mt-2 space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="cash_on_delivery"
                                        checked={paymentMethod === "cash_on_delivery"}
                                        onChange={() => setPaymentMethod("cash_on_delivery")}
                                    />
                                    <span>Cash on Delivery</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="sslcommerz"
                                        checked={paymentMethod === "sslcommerz"}
                                        onChange={() => setPaymentMethod("sslcommerz")}
                                    />
                                    <span>Pay online with SSLCommerz</span>
                                </label>
                            </div>
                            {paymentMethod === "sslcommerz" && (
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <label className="flex flex-col gap-1">
                                        <span>City</span>
                                        <input
                                            type="text"
                                            value={billingCity}
                                            onChange={(event) => {
                                                setBillingCity(event.target.value);
                                                setBillingErrors((errors) => ({ ...errors, city: "" }));
                                            }}
                                            maxLength={100}
                                            aria-required="true"
                                            aria-invalid={Boolean(billingErrors.city)}
                                            aria-describedby={billingErrors.city ? "billing-city-error" : undefined}
                                            className="rounded border px-3 py-2"
                                        />
                                        {billingErrors.city && <span id="billing-city-error" className="text-sm text-red-600">{billingErrors.city}</span>}
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span>Postcode</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={billingPostcode}
                                            onChange={(event) => {
                                                setBillingPostcode(event.target.value);
                                                setBillingErrors((errors) => ({ ...errors, postcode: "" }));
                                            }}
                                            maxLength={10}
                                            aria-required="true"
                                            aria-invalid={Boolean(billingErrors.postcode)}
                                            aria-describedby={billingErrors.postcode ? "billing-postcode-error" : undefined}
                                            className="rounded border px-3 py-2"
                                        />
                                        {billingErrors.postcode && <span id="billing-postcode-error" className="text-sm text-red-600">{billingErrors.postcode}</span>}
                                    </label>
                                </div>
                            )}
                        </div>
                        <div className="ml-3 mt-3 mb-3">
                            <h4>Costing Information</h4>
                            <div align="left" className="">
                                <p><b>Total Items:</b> {cart.reduce((total, item) => total + item.quantity, 0)}</p>
                                <p><b>Sub Total:</b> Tk {subTotal.toFixed(2)}</p>
                                <p><b>Restaurants:</b> {restaurantCount}</p>
                                <p><b>Shipping Charge:</b> Tk {(restaurantCount * 50).toFixed(2)}</p>
                                <p><b>Total Amount:</b> Tk {(subTotal + restaurantCount * 50).toFixed(2)}</p>
                                <div className="mt-3">
                                    <b>Restaurant summary</b>
                                    {Object.entries(restaurantGroups).map(([id, group]) => (
                                        <p key={id}>{group.name}: {group.items} item(s) · Tk {group.total.toFixed(2)} + Tk 50 delivery</p>
                                    ))}
                                </div>
                            </div>
                            <div align="left" className=" mt-3">
                                <button 
                                disabled={isDisabled}
                                className={`order-now-btn ${isDisabled ? 'cursor-not-allowed opacity-50' : ''
                                 }`} 
                                onClick={() => orderSubmit()}>Place Order</button>
                            </div>
                        </div>
                    </div>)
                }
                <div align="center" className="mt-5">
                    <Link href="/" className="shopping-btn">Continue Shopping</Link>
                </div>
            </div>
        </div>
    )
}

export default withUserAuth(PlaceOrder)