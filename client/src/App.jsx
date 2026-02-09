import { useState, useEffect } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  CreditCard,
  RefreshCw,
  User,
  ChevronDown,
  Code,
  Terminal,
  Play,
  Copy,
  Check,
  Plus,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const API_BASE = import.meta.env.VITE_API_BASE;

function App() {
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [wallet, setWallet] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionType, setTransactionType] = useState("TOPUP");

  // API Playground State
  const [showApiPlayground, setShowApiPlayground] = useState(false);
  const [apiMethod, setApiMethod] = useState("POST");
  const [apiEndpoint, setApiEndpoint] = useState("/wallet/topup");
  const [apiBody, setApiBody] = useState("{}");
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      // If no user selected yet, select the first one
      if (!selectedUser && data.length > 0) setSelectedUser(data[0].username);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch(`${API_BASE}/assets`);
        const data = await res.json();
        const assetsData = Array.isArray(data) ? data : [];
        setAssets(assetsData);
        if (assetsData.length > 0) setSelectedAsset(assetsData[0].name);
      } catch (error) {
        console.error("Failed to fetch assets", error);
      }
    };

    fetchUsers();
    fetchAssets();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [modalFeedback, setModalFeedback] = useState(null);

  const handleCreateUser = async () => {
    if (!newUsername.trim()) return;
    setModalFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername }),
      });
      const data = await res.json();

      if (res.ok) {
        await fetchUsers();
        setSelectedUser(newUsername);
        // setMessage({ type: "success", text: `User ${newUsername} created!` }); // Optional global toast
        setModalFeedback({
          type: "success",
          text: `User ${newUsername} created! Add another?`,
        });
        setNewUsername("");
        triggerConfetti();
        setIsModalOpen(false); // Close modal on success
      } else {
        setModalFeedback({
          type: "error",
          text: data.error || "Failed to create user",
        });
      }
    } catch (error) {
      setModalFeedback({ type: "error", text: error.message });
    }
  };

  // Sync API Body with Form State for convenience
  useEffect(() => {
    if (!showApiPlayground) return;

    // Default body based on current form
    const body = {
      userId: selectedUser,
      assetType: selectedAsset,
      amount: parseFloat(amount) || 0,
      idempotencyKey: crypto.randomUUID(),
      description: `API Playground Test`,
    };

    setApiBody(JSON.stringify(body, null, 2));

    // Update endpoint based on type
    if (transactionType === "TOPUP") setApiEndpoint("/wallet/topup");
    if (transactionType === "BONUS") setApiEndpoint("/wallet/bonus");
    if (transactionType === "SPEND") setApiEndpoint("/wallet/spend");
  }, [selectedUser, selectedAsset, amount, transactionType, showApiPlayground]);

  // Fetch Wallet and Transactions when user changes
  useEffect(() => {
    if (selectedUser) {
      fetchWallet();
      fetchTransactions();
    }
  }, [selectedUser]);

  const fetchWallet = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/wallet/${selectedUser}`);
      const data = await res.json();
      setWallet(data);
    } catch (error) {
      console.error("Failed to fetch wallet", error);
    } finally {
      setTimeout(() => setRefreshing(false), 500); // minimal spinner time
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${selectedUser}`);
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    }
  };

  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const handleTransaction = async () => {
    if (!amount || isNaN(amount) || amount <= 0) {
      setMessage({
        type: "error",
        text: "Please enter a valid positive amount",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        `${API_BASE}/wallet/${transactionType.toLowerCase()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser,
            assetType: selectedAsset,
            amount: parseFloat(amount),
            idempotencyKey: crypto.randomUUID(),
            description: `Frontend ${transactionType} transaction`,
          }),
        },
      );

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: `Success: ${data.message}` });
        fetchWallet();
        fetchTransactions(); // Refresh history
        setAmount("");

        if (transactionType === "BONUS" || transactionType === "TOPUP") {
          triggerConfetti();
        }
      } else {
        setMessage({
          type: "error",
          text: `Error: ${data.error || "Transaction failed"}`,
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: `Network Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const runApiRequest = async () => {
    setApiLoading(true);
    setApiResponse(null);
    try {
      // Parse body if method is POST
      const options = {
        method: apiMethod,
        headers: { "Content-Type": "application/json" },
      };
      if (apiMethod === "POST") {
        try {
          options.body = apiBody; // Assume valid JSON string
          JSON.parse(apiBody); // Validation check
        } catch (e) {
          throw new Error("Invalid JSON in request body");
        }
      }

      const res = await fetch(`${API_BASE}${apiEndpoint}`, options);
      const data = await res.json();

      setApiResponse({
        status: res.status,
        statusText: res.statusText,
        data: data,
      });

      // If success, refresh UI data too
      if (res.ok) {
        fetchWallet();
        fetchTransactions();
      }
    } catch (error) {
      setApiResponse({
        error: error.message,
      });
    } finally {
      setApiLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to get asset color/icon
  const getAssetIcon = (assetName) => {
    if (assetName.toLowerCase().includes("gold"))
      return <span className="text-yellow-400">●</span>;
    if (assetName.toLowerCase().includes("point"))
      return <span className="text-blue-400">★</span>;
    return <span className="text-gray-400">■</span>;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0F172A] to-black">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Wallet & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header / User Select */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                <Wallet size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                  DinoWallet
                </h1>
                <p className="text-slate-400 text-sm">Secure Internal Ledger</p>
              </div>
            </div>

            <div className="relative group w-full sm:w-auto flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-slate-500" />
                </div>
                <select
                  className="appearance-none w-full sm:w-64 bg-slate-800/50 border border-slate-700 text-slate-200 text-sm rounded-xl pl-10 pr-8 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all hover:bg-slate-800 cursor-pointer"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u._id} value={u.username}>
                      {u.username}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown size={16} className="text-slate-500" />
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                title="Add New User"
              >
                <Plus size={16} />
              </button>
            </div>
          </motion.div>

          {/* Wallet Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="wait">
              {wallet.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="col-span-full p-8 text-center text-slate-500 bg-white/5 rounded-2xl border border-white/5 border-dashed"
                >
                  {refreshing
                    ? "Loading balances..."
                    : "No wallets found for this user."}
                </motion.div>
              ) : (
                wallet.map((w, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-6 rounded-2xl shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full group-hover:bg-indigo-500/20 transition-all"></div>

                    <div className="flex justify-between items-start mb-4">
                      <span className="text-slate-400 font-medium tracking-wide text-xs uppercase flex items-center gap-2">
                        {getAssetIcon(w.asset)} {w.asset}
                      </span>
                      <button
                        onClick={fetchWallet}
                        disabled={refreshing}
                        className={`text-slate-500 hover:text-white transition-colors ${
                          refreshing ? "animate-spin" : ""
                        }`}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>

                    <div className="text-3xl font-bold text-white tracking-tight">
                      {w.balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Transaction History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <RefreshCw size={18} className="text-indigo-400" />
              Recent Activity
            </h3>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
            >
              <AnimatePresence initial={false}>
                {transactions.length === 0 ? (
                  <div className="text-slate-500 text-sm italic text-center py-4">
                    No recent transactions
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <motion.div
                      key={tx.id}
                      variants={itemVariants}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            tx.type === "SPEND"
                              ? "bg-red-500/10 text-red-400"
                              : tx.type === "BONUS"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {tx.type === "SPEND" ? (
                            <ArrowUpRight size={16} />
                          ) : tx.type === "BONUS" ? (
                            <Gift size={16} />
                          ) : (
                            <ArrowDownLeft size={16} />
                          )}
                        </div>
                        <div>
                          <p className="text-slate-200 text-sm font-medium">
                            {tx.type === "TOPUP"
                              ? "Top-up"
                              : tx.type === "BONUS"
                                ? "Bonus Reward"
                                : "Purchase"}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {new Date(tx.date).toLocaleDateString()} •{" "}
                            {new Date(tx.date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${
                            tx.type === "SPEND"
                              ? "text-red-400"
                              : "text-green-400"
                          }`}
                        >
                          {tx.type === "SPEND" ? "-" : "+"}
                          {Math.abs(tx.amount).toFixed(2)}
                        </p>
                        <p className="text-slate-500 text-xs">{tx.asset}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Column: Transaction Form OR API Playground */}
        <motion.div
          layout
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full relative"
        >
          {/* Toggle Switch */}
          <div className="absolute top-5 right-5 z-10">
            <button
              onClick={() => setShowApiPlayground(!showApiPlayground)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                showApiPlayground
                  ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20"
                  : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white hover:border-slate-500"
              }`}
            >
              {showApiPlayground ? (
                <>
                  <CreditCard size={14} />
                  <span>Back to UI</span>
                </>
              ) : (
                <>
                  <Terminal size={14} />
                  <span>Test API</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 p-6 lg:p-8 flex flex-col">
            {!showApiPlayground ? (
              // NORMAL FORM MODE
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <CreditCard size={20} className="text-indigo-400" />
                  New Transaction
                </h2>

                <div className="space-y-6 flex-1">
                  {/* Transaction Type Tabs */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-900/50 p-1 rounded-xl">
                    {["TOPUP", "BONUS", "SPEND"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setTransactionType(type)}
                        className={`py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${
                          transactionType === type
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                        Asset
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all hover:bg-slate-800"
                          value={selectedAsset}
                          onChange={(e) => setSelectedAsset(e.target.value)}
                        >
                          {assets.map((a) => (
                            <option key={a._id} value={a.name}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <ChevronDown size={16} className="text-slate-500" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                          $
                        </span>
                        <input
                          type="number"
                          className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-600"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visual Indicator of Action */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={transactionType}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            transactionType === "SPEND"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-green-500/10 text-green-400"
                          }`}
                        >
                          {transactionType === "SPEND" ? (
                            <ArrowUpRight size={18} />
                          ) : (
                            <ArrowDownLeft size={18} />
                          )}
                        </div>
                        <div className="text-sm">
                          <p className="text-slate-300">
                            {transactionType === "SPEND"
                              ? "Debiting from"
                              : "Crediting to"}{" "}
                            <span className="font-semibold text-white">
                              {selectedUser}
                            </span>
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {transactionType === "BONUS"
                              ? "Promotional Incentive"
                              : transactionType === "TOPUP"
                                ? "External Deposit"
                                : "Service Purchase"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Message Alert */}
                  <AnimatePresence>
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-3 rounded-lg text-sm flex items-start gap-2 overflow-hidden ${
                          message.type === "success"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {message.type === "success" ? (
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                          )}
                        </div>
                        {message.text}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTransaction}
                  disabled={loading}
                  className={`mt-6 w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                    loading
                      ? "bg-slate-700 cursor-not-allowed opacity-75"
                      : transactionType === "SPEND"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 hover:shadow-red-500/25"
                        : transactionType === "BONUS"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-orange-500/25"
                          : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/25"
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>
                      {transactionType === "SPEND"
                        ? "Confirm Payment"
                        : transactionType === "BONUS"
                          ? "Send Bonus"
                          : "Add Funds"}
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              // API PLAYGROUND MODE
              <motion.div
                key="api"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col h-full font-mono"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 font-sans">
                    <Terminal size={20} className="text-emerald-400" />
                    API Playground
                  </h2>
                  <p className="text-slate-400 text-xs mt-2 font-sans leading-relaxed">
                    This tool lets you interact directly with the backend
                    server. You can see the exact <strong>API Endpoint</strong>{" "}
                    being called and the <strong>JSON Body</strong> sent.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                  {/* Method & URL */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 font-sans">
                        Target Endpoint
                      </label>

                      {/* Presets */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setApiMethod("POST");
                            setApiEndpoint("/users");
                            setApiBody(
                              JSON.stringify({ username: "new_hero" }, null, 2),
                            );
                          }}
                          className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                        >
                          + User
                        </button>
                        <button
                          onClick={() => {
                            setApiMethod("GET");
                            setApiEndpoint("/users");
                            setApiBody("");
                          }}
                          className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                        >
                          List Users
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={apiMethod}
                        onChange={(e) => setApiMethod(e.target.value)}
                        className="bg-slate-800 text-white text-xs font-bold py-2 px-3 rounded-lg border border-slate-700 outline-none focus:border-emerald-500"
                      >
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                      </select>
                      <input
                        type="text"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Context Helper */}
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                    <p className="text-emerald-400/80 text-[10px] font-sans">
                      <strong className="text-emerald-400">
                        What happens on click?
                      </strong>
                      <br />
                      The server receives this request, processes the
                      transaction for user{" "}
                      <span className="font-mono bg-emerald-900/40 px-1 rounded text-emerald-200">
                        {selectedUser}
                      </span>
                      , and returns a success or error response which you'll see
                      below.
                    </p>
                  </div>

                  {/* Request Body (if POST) */}
                  {apiMethod === "POST" && (
                    <div className="space-y-1">
                      <h4 className="text-xs text-slate-500 font-sans tracking-wide">
                        REQUEST BODY (JSON)
                      </h4>
                      <textarea
                        value={apiBody}
                        onChange={(e) => setApiBody(e.target.value)}
                        className="w-full h-40 bg-slate-900 border border-slate-700 text-emerald-300 text-xs p-3 rounded-lg outline-none focus:border-emerald-500 font-mono resize-none leading-relaxed"
                      />
                    </div>
                  )}

                  {/* Send Button */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={runApiRequest}
                    disabled={apiLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all"
                  >
                    {apiLoading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Play size={16} fill="currentColor" />
                    )}
                    Send Request
                  </motion.button>

                  {/* Response Area */}
                  <AnimatePresence>
                    {apiResponse && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1 mt-4 border-t border-slate-800 pt-4"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs text-slate-500 font-sans tracking-wide">
                            RESPONSE
                          </h4>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${apiResponse.error || apiResponse.status >= 400 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}
                            >
                              {apiResponse.status
                                ? `${apiResponse.status} ${apiResponse.statusText}`
                                : "Error"}
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  JSON.stringify(
                                    apiResponse.data || apiResponse.error,
                                    null,
                                    2,
                                  ),
                                )
                              }
                              className="text-slate-500 hover:text-white transition-colors"
                            >
                              {copied ? (
                                <Check size={14} className="text-green-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-slate-900 rounded-lg"></div>
                          <pre className="relative z-10 w-full h-48 overflow-auto bg-slate-900/50 text-slate-300 text-xs p-3 rounded-lg border border-slate-800 custom-scrollbar">
                            {JSON.stringify(
                              apiResponse.data || apiResponse.error,
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
      {/* Add User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold text-white mb-1">
                Add New User
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Create a wallet for a new team member.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
                    placeholder="e.g. alice_wonder"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {modalFeedback && (
                  <div
                    className={`p-3 rounded-lg text-sm flex items-center gap-2 ${modalFeedback.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}
                  >
                    {modalFeedback.type === "success" ? (
                      <Check size={16} />
                    ) : (
                      <X size={16} />
                    )}
                    <span className="flex-1">{modalFeedback.text}</span>
                  </div>
                )}

                <button
                  onClick={handleCreateUser}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]"
                >
                  Create Wallet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
