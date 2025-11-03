'use client'
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import VerificationBadge from "../..//components/VerificationBadge";
import ReactPaginate from 'react-paginate';
import Link from "next/link";
import { CaretDown, CloudArrowUp, Gear, Megaphone, Trash, ArrowLeft, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import FullRoundedButton from "../../components/Button/FullRoundedButton";
import LabeledInput from "../../dashboard/components/LabeledInput";
import ConfirmMessage from "../../components/Modal/ConfirmMessage";
import { formatDateAsMMDDYYYY } from "@/utils/formatDate";
import UpgradePlanModal from "./upgradePlanModal";
import { useMessage } from "@/app/contexts/MessageContext";

const UsersManagement: React.FC = () => {
  const { setNotificationMessage } = useMessage();
  const router = useRouter();

  const [isOpenConfirmMessage, setIsOpenConfirmMessage] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10); // Rows per page
  const [total, setTotal] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAnnouncementEditorOpen, setIsAnnouncementEditorOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({}); // Temporary filters while dialog is open
  const [announcements, setAnnouncements] = useState({ title: '', content: '' })
  const [tempAnnouncements, setTempAnnouncements] = useState({ title: '', content: '' });
  const [isOpenUpgradePlanModal, setIsOpenUpgradePlanModal] = useState(false);
  const [upgradeUser, setUpgradeUser] = useState(null);
  const [exportLoading, setExportLoading] = useState(false)

  const announcementsRef = useRef(announcements);

  // Add page size options
  const pageSizeOptions = [10, 15, 20, 25];

  const fetchUserList = async () => {
    setIsLoading(true);
    try {
      // Convert isVerified string to boolean before sending to API
      const processedFilters = {
        ...filters,
        isVerified: filters.isVerified === 'true' ? true :
          filters.isVerified === 'false' ? false : undefined
      };

      const response = await fetch('/api/user/list', {
        method: 'POST',
        body: JSON.stringify({ page, limit, filters: processedFilters })
      });

      const userList = await response.json();
      setData(userList.data);
      setTotal(userList.count);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch('/api/user', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const userData = await response.json();

      if (userData.role !== 'admin') {
        router.push("/login");
      } else {
        fetchUserList();
      }
    }

    fetchUser();
  }, [])

  useEffect(() => {
    announcementsRef.current = announcements;
  }, [announcements])

  useEffect(() => {
    fetchUserList();
  }, [limit, page, filters]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const response = await fetch('/api/announcements', {
        method: 'GET',
      });

      const fetchData = await response.json();
      setAnnouncements(fetchData);
      setTempAnnouncements(fetchData);
    }

    fetchAnnouncements();
  }, [])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDraftFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAnnouncementsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTempAnnouncements((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
    setIsFilterOpen(false);
  };

  const cancelFilters = () => {
    setDraftFilters(filters);
    setIsFilterOpen(false);
  };

  const handleUpdateUser = (id: string, subscription_status: string, current_period_end: Date | null) => {
    setData((prev: any) => {
      const updatedData = prev.map((user: any) => {
        if (user.id === id) {
          return { ...user, subscription_status, current_period_end };
        }
        return user;
      });
      return updatedData;
    });
  }

  const applyAnnouncements = async () => {
    setAnnouncements(tempAnnouncements);
    setIsSaving(true);

    const response = await fetch("/api/announcements", {
      method: "PUT",
      body: JSON.stringify(tempAnnouncements)
    });

    const data = response.json();

    setNotificationMessage({ message: "Saved announcements content!", type: 'success' })
    setIsAnnouncementEditorOpen(false);
    setIsSaving(false);
  }

  const cancelAnnouncements = () => {
    setTempAnnouncements(announcementsRef.current);
    setIsAnnouncementEditorOpen(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('filter-dropdown');
      const filterButton = document.getElementById('filter-button');

      const announcementEditor = document.getElementById('announcement-editor');
      const announcementButton = document.getElementById('announcement-button');

      if (
        dropdown &&
        !dropdown.contains(event.target as Node) &&
        !filterButton?.contains(event.target as Node)
      ) {
        cancelFilters();
      }

      if (
        announcementEditor &&
        !announcementEditor.contains(event.target as Node) &&
        !announcementButton?.contains(event.target as Node)
      ) {
        cancelAnnouncements();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen, isAnnouncementEditorOpen]);

  const handleViewDashboard = (userId: string) => {
    window.open(`/dashboard?userId=${userId}`, '_blank');
  };

  const handleDelete = async () => {
    const response = await fetch('/api/user', {
      method: 'DELETE',
      body: JSON.stringify({ id: deleteUserId, email: deleteEmail })
    });

    const data = await response.json();

    if (data.error) {
      console.log("Failed to delete", data.error);
    } else {
      fetchUserList();
      setIsOpenConfirmMessage(false);
    }
  }

  const openDeleteConfirmMessage = (userId: string, email: string) => {
    setDeleteUserId(userId);
    setDeleteEmail(email);
    setIsOpenConfirmMessage(true);
  }

  const upgradePlan = (userId: string) => {
    const user = data.find((user: any) => user.id === userId);
    if (user) {
      setUpgradeUser(user);
      setIsOpenUpgradePlanModal(true);
    }
  }

  const totalPages = Math.ceil(total / limit);

  const handleExportUsers = async () => {
    setExportLoading(true);

    try {
      const response = await fetch('/api/user/list', {
        method: 'GET',
      });

      const { data }: { data: Array<UserType[]> } = await response.json();

      // Convert filtered data to CSV
      const csvContent = convertToCSV(data);

      // Trigger download
      triggerCSVDownload(csvContent, 'users_export.csv');
    } catch (error) {
      setNotificationMessage({ message: "Error exporting users", type: "error" });
    } finally {
      setExportLoading(false);
    }
  };

  // Helper function to convert JSON to CSV
  function convertToCSV<T extends Record<string, any>>(arr: T[]): string {
    if (arr.length === 0) return '';
  
    // Ensure header row is an array of strings
    const headers: string[] = Object.keys(arr[0]);
  
    // Convert each object to an array of values
    const rows: string[][] = arr.map(item => headers.map(key => String(item[key])));
  
    // Combine headers and rows into CSV format
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Helper function to trigger CSV download
  function triggerCSVDownload(csvContent: string, fileName: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          <FullRoundedButton
            id="offerCode-button"
            onClick={() => router.push('/dashboard')}
            className="shadow-md"
          >
            <ArrowLeft size={20} className="mr-1" />
            Dashboard
          </FullRoundedButton>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          {/* Filter Button and Dropdown */}
          <div className="relative w-full sm:w-auto">
            <FullRoundedButton
              id="filter-button"
              onClick={() => {
                const opening = !isFilterOpen;
                setIsFilterOpen(opening);
                if (opening) {
                  setDraftFilters(filters);
                }
              }}
              className="shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filters
            </FullRoundedButton>

            {isFilterOpen && (
              <div
                id="filter-dropdown"
                className="absolute left-0 mt-2 w-full sm:w-96 bg-[#f1f1f3] border rounded-[26px] shadow-xl z-10"
              >
                <div className="p-4">
                  <h3 className="font-semibold mb-4 text-gray-700">Filter Users</h3>

                  {/* Text inputs */}
                  <div className="flex-col-gap">
                    {['email', 'first_name', 'middle_name', 'last_name', 'username', 'country'].map((field) => (
                      <LabeledInput
                        label={field.replace('_', ' ').slice(0, 1).toUpperCase() + field.replace('_', ' ').slice(1).toLowerCase()}
                        key={field}
                        name={field}
                        type="text"
                        value={draftFilters[field] || ''}
                        onChange={handleFilterChange}
                      />
                    ))}

                    {/* Select boxes */}
                    <div className="mb-3 relative">
                      <div className="relative">
                        <select
                          name="subscription_status"
                          value={draftFilters.subscription_status || ''}
                          onChange={handleFilterChange}
                          className="w-full appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
                        >
                          <option value="">All Subscription Status</option>
                          <option value="trialing">Trialing</option>
                          <option value="FREE">Free</option>
                          <option value="PRO">Pro</option>
                          <option value="PREMIUM PRO">Premium Pro</option>
                        </select>
                        <CaretDown
                          size={20}
                          weight="bold"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none"
                        />
                      </div>
                    </div>

                    <div className="mb-3 relative">
                      <div className="relative">
                        <select
                          name="isVerified"
                          value={draftFilters.isVerified || ''}
                          onChange={handleFilterChange}
                          className="w-full appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
                        >
                          <option value="">All Verification Status</option>
                          <option value="true">Verified</option>
                          <option value="false">Not Verified</option>
                        </select>
                        <CaretDown
                          size={20}
                          weight="bold"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="border-t p-4 flex justify-end space-x-2 bg-gray-50 rounded-b-[26px]">
                  <FullRoundedButton
                    onClick={cancelFilters}
                    buttonType="danger"
                  >
                    Cancel
                  </FullRoundedButton>
                  <FullRoundedButton
                    onClick={applyFilters}
                  >
                    Apply Filters
                  </FullRoundedButton>
                </div>
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-auto">
            <FullRoundedButton
              id="announcement-button"
              onClick={() => setIsAnnouncementEditorOpen(!isAnnouncementEditorOpen)}
              className="shadow-md"
            >
              <Megaphone size={22} className="mr-1" />
              Universal Message
            </FullRoundedButton>

            {isAnnouncementEditorOpen && (
              <div
                id="announcement-editor"
                className="absolute left-0 mt-2 w-full sm:w-96 bg-[#f1f1f3] border rounded-[26px] shadow-xl z-10"
              >
                <div className="p-4">
                  <h3 className="font-semibold mb-4 text-gray-700">Manage Announcements</h3>

                  {/* Text inputs */}
                  <div className="space-y-3">
                    <LabeledInput
                      label="Title"
                      name="title"
                      type="text"
                      value={tempAnnouncements.title}
                      onChange={handleAnnouncementsChange}
                    />
                    <LabeledInput
                      label="Content"
                      name="content"
                      type="text"
                      value={tempAnnouncements.content}
                      onChange={handleAnnouncementsChange}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="border-t p-4 flex justify-end space-x-2 bg-gray-50 rounded-b-[26px]">
                  <FullRoundedButton
                    onClick={cancelAnnouncements}
                    buttonType="danger"
                  >
                    Cancel
                  </FullRoundedButton>
                  <FullRoundedButton
                    isLoading={isSaving}
                    onClick={applyAnnouncements}
                  >
                    Save
                  </FullRoundedButton>
                </div>
              </div>
            )}
          </div>

          <div className="relative flex-grow w-full sm:w-auto">
            <FullRoundedButton
              onClick={handleExportUsers}
              className="shadow-md"
              isLoading={exportLoading}
            >
              <DownloadSimple size={22} className="mr-1" />
              Export Users
            </FullRoundedButton>
          </div>

          {totalPages > 1 &&
            <>
              {/* Top right controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                <div className="flex justify-end items-center gap-2 w-full sm:w-auto">
                  <label htmlFor="pageSize" className="text-sm text-gray-600 whitespace-nowrap">
                    Rows per page:
                  </label>
                  <div className="relative">
                    <select
                      id="pageSize"
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="w-24 appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
                    >
                      {pageSizeOptions.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <CaretDown
                      size={20}
                      weight="bold"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none"
                    />
                  </div>
                </div>

                <div className="w-full flex justify-center sm:w-auto overflow-x-auto">
                  <ReactPaginate
                    previousLabel="<"
                    nextLabel=">"
                    breakLabel="..."
                    pageCount={totalPages}
                    marginPagesDisplayed={1}
                    pageRangeDisplayed={3}
                    onPageChange={({ selected }) => setPage(selected + 1)}
                    forcePage={page - 1}
                    containerClassName="flex items-center gap-1 min-w-fit mb-0"
                    pageClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
                    activeClassName="!bg-primary-1 hover:!bg-primary-2 text-white cursor-pointer"
                    previousClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
                    nextClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
                    disabledClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
                    breakClassName="px-3 py-2"
                  />
                </div>
              </div>
            </>}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-[26px] border border-gray-200 shadow-xl pb-1">
          <table className="w-full min-w-[2400px]">
            <thead className="bg-primary-1 text-white">
              <tr>
                <th className="border-b px-4 py-3 text-left text-sm font-semibold">#</th>
                <th className="border-b px-4 py-3 text-left text-sm font-semibold">Title</th>
                <th className="border-b px-4 py-3 text-left text-sm font-semibold">First Name</th>
                <th className="border-b px-4 py-3 text-left text-sm font-semibold">Last Name</th>
                <th className="border-b px-4 py-3 text-left text-sm font-semibold">Email</th>
                <th className="border-b px-4 py-3 text-left text-sm font-semibold">Username</th>
                <th className="border-b px-4 py-3 text-left text-sm font-semibold">Position</th>
                <th className="border-b px-4 py-3 text-left text-sm font-semibold">Country</th>
                <th className="border-b px-4 py-3 text-center text-sm font-semibold">Registered At</th>
                <th className="border-b px-4 py-3 text-center text-sm font-semibold">Subscription Status</th>
                <th className="border-b px-4 py-3 text-center text-sm font-semibold">Current Period End</th>
                <th className="border-b px-4 py-3 text-center text-sm font-semibold">Trial End</th>
                <th className="border-b px-4 py-3 text-center text-sm font-semibold">Verified</th>
                <th className="border-b px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: limit }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {Array.from({ length: 14 }).map((_, cellIndex) => (
                      <td key={`skeleton-cell-${cellIndex}`} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <p className="text-xl font-semibold">No users found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row: any, index) => (
                  <tr key={row.id} className="hover:bg-gray-50  text-sm text-gray-700">
                    <td className="px-4 py-3">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3">{row.title}</td>
                    <td className="px-4 py-3">{row.first_name}</td>
                    <td className="px-4 py-3">{row.last_name}</td>
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3">{row.username}</td>
                    <td className="px-4 py-3">{row.position}</td>
                    <td className="px-4 py-3">{row.country}</td>
                    <td className="px-4 py-3 text-center">{formatDateAsMMDDYYYY(row.created_at)}</td>
                    <td className="px-4 text-center">
                      <div className="flex flex-col justify-center items-center gap-1">
                        {row.trial_end && new Date(row.trial_end) > new Date() &&
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white`}>
                            trialing
                          </div>}
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.subscription_status === "PRO" ? 'bg-green-500 text-white' :
                          row.subscription_status === "PREMIUM PRO" ? 'bg-purple-500 text-white' :
                            'bg-gray-500 text-white'
                          }`}>
                          {(row.subscription_status === null || row.subscription_status === '')
                            ? 'Free'
                            : row.subscription_status.charAt(0).toUpperCase() + row.subscription_status.slice(1).toLowerCase()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{row.current_period_end ? formatDateAsMMDDYYYY(row.current_period_end) : '-'}</td>
                    <td className="px-4 py-3 text-center">{row.trial_end ? formatDateAsMMDDYYYY(row.trial_end) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center items-center gap-2">{row.isVerified ? <VerificationBadge /> : ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex justify-center items-center gap-2">
                        {row.dentistries &&
                          <>
                            <Link
                              href={`/${row.username}`}
                              target="_blank"
                              className="text-gray-600 hover:text-blue-600 transition-colors inline-flex"
                              title="View Dentist"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-5 h-5"
                              >
                                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                                <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                              </svg>
                            </Link>

                            <button
                              onClick={() => handleViewDashboard(row.id)}
                              className="text-gray-600 hover:text-primary-1 transition-colors inline-flex"
                              title="View Dashboard"
                            >
                              <Gear weight="fill" size={20} />
                            </button>

                            <button
                              onClick={() => upgradePlan(row.id)}
                              className="text-gray-600 hover:text-primary-1 transition-colors inline-flex"
                              title="Change Plan"
                            >
                              <CloudArrowUp weight="fill" size={20} />
                            </button>
                          </>}

                        <button
                          onClick={() => openDeleteConfirmMessage(row.id, row.email)}
                          className="text-gray-600 hover:text-red-600 transition-colors inline-flex"
                          title="Delete Dentist"
                        >
                          <Trash weight="fill" size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ConfirmMessage
          title="Delete user?"
          description="Are you sure you want to delete the user?"
          okText="Delete"
          type="danger"
          isOpen={isOpenConfirmMessage}
          onClose={() => setIsOpenConfirmMessage(false)}
          onOk={handleDelete}
        />

        <UpgradePlanModal
          isOpen={isOpenUpgradePlanModal}
          onClose={() => setIsOpenUpgradePlanModal(false)}
          user={upgradeUser}
          onSuccess={handleUpdateUser}
        />
      </div>
    </div>
  );
}

export default UsersManagement;
