import React, { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import MainLayout from "../../layout/MainLayout";

const KEY_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_KEY_LENGTH = 64;
const MAX_MESSAGE_LENGTH = 5000;

export default function AutomateFeedback() {
  const [templates, setTemplates] = useState([]);
  const [templateKey, setTemplateKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await apiClient.get("/reviews/seller/templates");
        if (!cancelled) setTemplates(response.data || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load templates",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    const key = templateKey.trim();
    const msg = message.trim();

    if (!key || key.length > MAX_KEY_LENGTH) {
      setError(`Template key is required and must not exceed ${MAX_KEY_LENGTH} characters.`);
      return;
    }

    if (!KEY_REGEX.test(key)) {
      setError("Template key can only contain alphanumeric characters, dashes, and underscores.");
      return;
    }

    if (!msg || msg.length > MAX_MESSAGE_LENGTH) {
      setError(`Feedback message is required and must not exceed ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const next = [
        ...templates.filter((item) => item.templateKey !== key),
        { templateKey: key, message: msg },
      ];
      await apiClient.put("/reviews/seller/templates", { templates: next });
      setTemplates(next);
      setTemplateKey("");
      setMessage("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save template",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const removeTemplate = async (keyToRemove) => {
    try {
      setSubmitting(true);
      setError("");
      const next = templates.filter((item) => item.templateKey !== keyToRemove);
      await apiClient.put("/reviews/seller/templates", { templates: next });
      setTemplates(next);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete template",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Automate Feedback</h1>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-300 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={save}
          className="bg-white shadow rounded-lg p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Template Key
            </label>
            <input
              required
              value={templateKey}
              onChange={(event) => setTemplateKey(event.target.value)}
              placeholder="e.g. positive-response-1"
              maxLength={MAX_KEY_LENGTH}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Feedback Message
            </label>
            <textarea
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Enter your auto feedback message here..."
              className="w-full border rounded px-3 py-2"
              rows={5}
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <div className="text-xs text-gray-500 mt-1">
              {message.length} / {MAX_MESSAGE_LENGTH} characters
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save template"}
          </button>
        </form>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Saved Templates</h2>
          {loading ? (
            <p className="text-gray-500">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-gray-500">No automation templates saved yet.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  className="border rounded p-4 bg-white shadow-sm flex justify-between items-start"
                  key={template.templateKey}
                >
                  <div className="flex-1 mr-4">
                    <strong className="text-blue-600 block mb-1">
                      {template.templateKey}
                    </strong>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {template.message}
                    </p>
                  </div>
                  <button
                    onClick={() => removeTemplate(template.templateKey)}
                    disabled={submitting}
                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}