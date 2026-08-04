import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MaintenanceLogAttachments } from "./MaintenanceLogAttachments";
import { maintenanceLogSliceReducer, type MaintenanceLog } from "../../store/slices/maintenanceLogSlice";

vi.mock("../../api/maintenanceAttachmentsApi", () => ({
  maintenanceAttachmentsApi: {
    initiate: vi.fn(),
    confirm: vi.fn(),
    getUrl: vi.fn(),
    delete: vi.fn(),
    uploadToPresignedUrl: vi.fn(),
  },
}));

import { maintenanceAttachmentsApi } from "../../api/maintenanceAttachmentsApi";

const log = (overrides: Partial<MaintenanceLog> = {}): MaintenanceLog =>
  ({
    id: 1,
    vehicleId: 1,
    serviceDate: "2026-01-01",
    odometerReading: 1000,
    serviceType: "OilChange",
    performedBy: "Self",
    attachments: [],
    ...overrides,
  }) as MaintenanceLog;

function renderComponent(initialLog: MaintenanceLog) {
  const store = configureStore({
    reducer: { maintenanceLogs: maintenanceLogSliceReducer },
    preloadedState: { maintenanceLogs: { recentMaintenanceLogs: [initialLog], loading: false } },
  });
  const utils = render(
    <Provider store={store}>
      <MaintenanceLogAttachments vehicleId={1} maintenanceLogId={1} />
    </Provider>,
  );
  return { store, ...utils };
}

const openSpy = vi.fn();

describe("MaintenanceLogAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("open", openSpy);
  });

  it("renders nothing in the list when there are no attachments", () => {
    renderComponent(log());
    expect(screen.getByText("Attachments")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("lists existing attachments by file name", () => {
    renderComponent(
      log({ attachments: [{ id: 1, fileId: "a", fileName: "receipt.pdf", contentType: "application/pdf" }] }),
    );
    expect(screen.getByText("receipt.pdf")).toBeInTheDocument();
  });

  it("opens a download URL in a new tab when View is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(maintenanceAttachmentsApi.getUrl).mockResolvedValue({
      url: "https://filestore.test/download/abc",
      expiresAt: "2026-01-01T01:00:00.000Z",
    });
    renderComponent(
      log({ attachments: [{ id: 1, fileId: "a", fileName: "receipt.pdf", contentType: "application/pdf" }] }),
    );

    await user.click(screen.getByRole("button", { name: /view receipt.pdf/i }));

    await waitFor(() => expect(maintenanceAttachmentsApi.getUrl).toHaveBeenCalledWith(1, 1, 1));
    expect(openSpy).toHaveBeenCalledWith("https://filestore.test/download/abc", "_blank", "noopener,noreferrer");
  });

  it("shows an error message when the view URL request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(maintenanceAttachmentsApi.getUrl).mockRejectedValue(new Error("boom"));
    renderComponent(
      log({ attachments: [{ id: 1, fileId: "a", fileName: "receipt.pdf", contentType: "application/pdf" }] }),
    );

    await user.click(screen.getByRole("button", { name: /view receipt.pdf/i }));

    expect(await screen.findByText(/failed to open attachment/i)).toBeInTheDocument();
  });

  it("deletes an attachment after confirming", async () => {
    const user = userEvent.setup();
    vi.mocked(maintenanceAttachmentsApi.delete).mockResolvedValue(undefined);
    const { store } = renderComponent(
      log({ attachments: [{ id: 1, fileId: "a", fileName: "receipt.pdf", contentType: "application/pdf" }] }),
    );

    await user.click(screen.getByRole("button", { name: /delete receipt.pdf/i }));
    await user.click(await screen.findByText("Yes"));

    await waitFor(() => expect(maintenanceAttachmentsApi.delete).toHaveBeenCalledWith(1, 1, 1));
    await waitFor(() => expect(store.getState().maintenanceLogs.recentMaintenanceLogs[0].attachments).toEqual([]));
  });

  it("shows an error message when delete fails", async () => {
    const user = userEvent.setup();
    vi.mocked(maintenanceAttachmentsApi.delete).mockRejectedValue(new Error("boom"));
    renderComponent(
      log({ attachments: [{ id: 1, fileId: "a", fileName: "receipt.pdf", contentType: "application/pdf" }] }),
    );

    await user.click(screen.getByRole("button", { name: /delete receipt.pdf/i }));
    await user.click(await screen.findByText("Yes"));

    expect(await screen.findByText(/failed to delete attachment/i)).toBeInTheDocument();
  });

  it("uploads a chosen file and confirms it", async () => {
    vi.mocked(maintenanceAttachmentsApi.initiate).mockResolvedValue({
      attachmentId: 9,
      uploadUrl: "https://filestore.test/upload/abc",
      expiresAt: "2026-01-01T00:15:00.000Z",
    });
    vi.mocked(maintenanceAttachmentsApi.uploadToPresignedUrl).mockResolvedValue(undefined);
    vi.mocked(maintenanceAttachmentsApi.confirm).mockResolvedValue({
      id: 9,
      fileId: "file-guid",
      fileName: "new-receipt.pdf",
      contentType: "application/pdf",
    });
    const { container, store } = renderComponent(log());

    const file = new File(["contents"], "new-receipt.pdf", { type: "application/pdf" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => expect(maintenanceAttachmentsApi.initiate).toHaveBeenCalled());
    await waitFor(() =>
      expect(store.getState().maintenanceLogs.recentMaintenanceLogs[0].attachments).toEqual([
        { id: 9, fileId: "file-guid", fileName: "new-receipt.pdf", contentType: "application/pdf" },
      ]),
    );
  });
});
