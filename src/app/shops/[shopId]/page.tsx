'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Modal, { Styles } from 'react-modal'; // Import Styles type
import Image from 'next/image'; // Import next/image

interface SimpleShop {
  id: string;
  name: string;
  address: string | null;
}

interface SimpleDrink {
  id: string;
  name: string;
  shopId: string;
}

interface RatingInput {
  ratingValue: string; // Keep as string for input control
  reviewText: string;
}

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Rating {
  id: string;
  ratingValue: number;
  reviewText: string | null;
  createdAt: string;
  userId: string;
  user: User;
}

interface DrinkRatingData {
  averageRating: number | null;
  ratingCount: number;
  ratings: Rating[];
  isLoading: boolean;
  error: string | null;
}

// Type for the state storing ratings for all drinks
type AllRatingsState = Record<string, DrinkRatingData>;

// Type for the state storing rating inputs for all drinks
type AllRatingInputsState = Record<string, RatingInput>;

// Modal Custom Styles (optional, adjust as needed)
const customModalStyles: Styles = { // Explicitly type with Styles
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    maxHeight: '80vh', // Limit height and allow scrolling
    overflowY: 'auto', // Should now be type-correct
    minWidth: '300px', // Ensure a minimum width
    maxWidth: '600px',
    width: '90%', // Responsive width
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    background: '#fff',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Darken the background
    zIndex: 1000, // Ensure modal is on top
  }
};

// Set App Element for Accessibility (important!)
// Do this once, ideally outside the component or in a useEffect with empty dependency array
// If using Next.js App Router, we might need to do this in useEffect


export default function ShopDetailPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  const { status: sessionStatus, data: session } = useSession();

  // Initialize Modal App Element in useEffect
  useEffect(() => {
    Modal.setAppElement('body'); // Or a more specific root element if available
  }, []);

  const [shop, setShop] = useState<SimpleShop | null>(null);
  const [drinks, setDrinks] = useState<SimpleDrink[]>([]);
  const [newDrinkName, setNewDrinkName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingDrinks, setLoadingDrinks] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);
  const [drinksError, setDrinksError] = useState<string | null>(null);

  // State for rating inputs and fetched ratings, keyed by drink ID
  const [ratingInputs, setRatingInputs] = useState<AllRatingInputsState>({});
  const [allRatings, setAllRatings] = useState<AllRatingsState>({});
  const [ratingError, setRatingError] = useState<string | null>(null); // For submission errors

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDrinkForModal, setSelectedDrinkForModal] = useState<SimpleDrink | null>(null);

  // --- Fetch Shop Details ---
  useEffect(() => {
    if (!shopId) return;
    setLoadingShop(true);
    setShopError(null);
    fetch(`/api/shops/${shopId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({})); // Catch potential JSON parse error
          throw new Error(errorData.error || `Failed to fetch shop: ${res.statusText} (${res.status})`);
        }
        return res.json();
      })
      .then((data: SimpleShop) => {
        setShop(data);
      })
      .catch((err) => {
        console.error("Error fetching shop details:", err);
        setShopError(err.message || 'Could not load shop details.');
      })
      .finally(() => {
        setLoadingShop(false);
      });
  }, [shopId]);

  // --- Fetch Drinks for the Shop ---
  useEffect(() => {
    if (!shopId) return;
    setLoadingDrinks(true);
    setDrinksError(null);
    fetch(`/api/shops/${shopId}/drinks`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch drinks: ${res.statusText} (${res.status})`);
        }
        return res.json();
      })
      .then((data: SimpleDrink[]) => {
        setDrinks(data);
        // Initialize rating input state for each drink
        const initialInputs: AllRatingInputsState = {};
        const initialRatingsData: AllRatingsState = {};
        data.forEach(drink => {
          initialInputs[drink.id] = { ratingValue: '', reviewText: '' };
          initialRatingsData[drink.id] = { averageRating: null, ratingCount: 0, ratings: [], isLoading: false, error: null }; // Start with non-loading state
        });
        setRatingInputs(initialInputs);
        setAllRatings(initialRatingsData);
      })
      .catch((err) => {
        console.error("Error fetching drinks:", err);
        setDrinksError(err.message || 'Could not load drinks for this shop.');
      })
      .finally(() => {
        setLoadingDrinks(false);
      });
  }, [shopId]);

  // --- Function to Fetch Ratings for a Specific Drink ---
  const fetchRatingsForDrink = useCallback(async (drinkId: string) => {
    setAllRatings(prev => ({
      ...prev,
      [drinkId]: { ...(prev[drinkId] || { ratings: [], averageRating: null, ratingCount: 0 }), isLoading: true, error: null }
    }));

    try {
      const response = await fetch(`/api/drinks/${drinkId}/ratings`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch ratings (${response.status})`);
      }
      const data: { averageRating: number | null; ratingCount: number; ratings: Rating[] } = await response.json();
      setAllRatings(prev => ({
        ...prev,
        [drinkId]: { ...data, isLoading: false, error: null }
      }));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An error occurred fetching ratings.');
      console.error(`Error fetching ratings for drink ${drinkId}:`, error);
      setAllRatings(prev => ({
        ...prev,
        [drinkId]: { ...(prev[drinkId] || { ratings: [], averageRating: null, ratingCount: 0 }), isLoading: false, error: error.message }
      }));
    }
  }, []);

  // --- Modal Handling ---
  const openModal = (drink: SimpleDrink) => {
    setSelectedDrinkForModal(drink);
    setIsModalOpen(true);
    // Fetch ratings for the selected drink if not already loaded or if there was an error
    if (!allRatings[drink.id] || allRatings[drink.id]?.ratings.length === 0 || allRatings[drink.id]?.error) {
       if (!allRatings[drink.id]?.isLoading) { // Avoid fetching if already loading
           fetchRatingsForDrink(drink.id);
       }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDrinkForModal(null);
    setRatingError(null); // Clear submission errors when closing modal
  };

  // --- Handle Drink Addition ---
  const handleAddDrink = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newDrinkName.trim()) {
      setFormError('Drink name cannot be empty.');
      return;
    }

    try {
      const response = await fetch(`/api/shops/${shopId}/drinks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newDrinkName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add drink (${response.status})`);
      }

      const newlyAddedDrink: SimpleDrink = await response.json();

      // Update drinks list and initialize state for the new drink
      setDrinks(prevDrinks => [...prevDrinks, newlyAddedDrink]);
      setRatingInputs(prev => ({ ...prev, [newlyAddedDrink.id]: { ratingValue: '', reviewText: '' } }));
      setAllRatings(prev => ({ ...prev, [newlyAddedDrink.id]: { averageRating: null, ratingCount: 0, ratings: [], isLoading: false, error: null } }));
      setNewDrinkName(''); // Clear the input field
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An error occurred while adding the drink.');
      setFormError(error.message);
      console.error("Add drink error:", err);
    }
  };

  // --- Handle Rating Input Change ---
  const handleRatingInputChange = (drinkId: string, field: keyof RatingInput, value: string) => {
    setRatingInputs(prev => ({
      ...prev,
      [drinkId]: {
        ...prev[drinkId],
        [field]: value,
      },
    }));
  };

  // --- Handle Rating Submission ---
  const handleRatingSubmit = async (e: FormEvent, drinkId: string) => {
    e.preventDefault();
    setRatingError(null); // Clear previous errors

    if (!session || sessionStatus !== 'authenticated') {
      setRatingError('You must be logged in to rate.');
      return;
    }

    const { ratingValue, reviewText } = ratingInputs[drinkId];
    const ratingNumber = parseInt(ratingValue, 10);

    if (!ratingValue || isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      setRatingError('Please select a rating between 1 and 5.');
      return;
    }

    try {
      const response = await fetch(`/api/drinks/${drinkId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ratingValue: ratingNumber, reviewText: reviewText }), // Use ratingValue and reviewText
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to submit rating (${response.status})`);
      }

      // Rating submitted successfully
      // Optionally clear the input fields for this drink
      // setRatingInputs(prev => ({ ...prev, [drinkId]: { ratingValue: '', reviewText: '' } }));
      
      // Refetch ratings to show the new one immediately
      await fetchRatingsForDrink(drinkId);

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An error occurred submitting the rating.');
      console.error('Rating submission error:', error);
      setRatingError(error.message);
    }
  };

  // --- Render Logic ---
  if (loadingShop) return <div className="p-4 text-center">Loading shop details...</div>;
  if (shopError) return <div className="p-4 text-center text-red-600">Error: {shopError}</div>;
  if (!shop) return <div className="p-4 text-center">Shop not found.</div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-800">{shop.name}</h1>
      {shop.address && <p className="text-md text-gray-600 mb-6">{shop.address}</p>}

      <h2 className="text-2xl font-semibold mb-4 text-gray-700">Drinks Menu</h2>
      {loadingDrinks && <p>Loading drinks...</p>}
      {drinksError && <p className="text-red-500">Error loading drinks: {drinksError}</p>}
      {!loadingDrinks && drinks.length === 0 && <p className="text-gray-500 italic">No drinks listed for this shop yet.</p>}

      {/* Drinks List */}
      {!loadingDrinks && drinks.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"> {/* Use grid for columns */} 
          {drinks.map((drink) => (
            <li
              key={drink.id}
              className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" // Compact padding, add cursor
              onClick={() => openModal(drink)} // Open modal on click
            >
              <div className="flex justify-between items-center">
                 <h3 className="text-lg font-medium text-gray-800">{drink.name}</h3>
                 {/* Display average rating concisely */}
                 {allRatings[drink.id] && !allRatings[drink.id].isLoading && allRatings[drink.id].averageRating !== null && (
                     <span className="text-sm font-semibold text-yellow-600">
                         ★ {allRatings[drink.id].averageRating?.toFixed(1)} ({allRatings[drink.id].ratingCount})
                     </span>
                 )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add Drink Form (Conditionally Rendered) */} 
      {sessionStatus === 'authenticated' && session?.user?.role === 'DRINK_ADMIN' && (
        <form onSubmit={handleAddDrink} className="mt-8 p-4 border rounded-lg shadow bg-gray-50">
          <h3 className="text-xl font-semibold mb-3 text-black">Add New Drink to Menu</h3>
          <div className="mb-3">
            <label htmlFor="drinkName" className="block text-sm font-medium text-gray-700 mb-1">
              Drink Name:
            </label>
            <input
              type="text"
              id="drinkName"
              value={newDrinkName}
              onChange={(e) => setNewDrinkName(e.target.value)}
              className="text-black w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Brown Sugar Pearl Latte"
              required
            />
          </div>
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Drink
          </button>
        </form>
      )}

      {/* Rating Modal */} 
      {selectedDrinkForModal && (
          <Modal
              isOpen={isModalOpen}
              onRequestClose={closeModal}
              style={customModalStyles}
              contentLabel="Rate Drink Modal"
          >
              <div className="flex justify-between items-start mb-4">
                 <h2 className="text-2xl font-semibold text-gray-800">Rate: {selectedDrinkForModal.name}</h2>
                 <button onClick={closeModal} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
              </div>

              {/* Rating Submission Form */} 
              {sessionStatus === 'authenticated' && (
                  <form onSubmit={(e) => handleRatingSubmit(e, selectedDrinkForModal.id)} className="mb-6 p-4 border rounded bg-gray-50">
                      <h4 className="text-lg font-medium mb-2 text-black">Submit Your Rating</h4>
                      {/* Rating Input (e.g., Stars) */} 
                      <div className="mb-3">
                          <label htmlFor={`rating-${selectedDrinkForModal.id}`} className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5):</label>
                          <select
                              id={`rating-${selectedDrinkForModal.id}`}
                              value={ratingInputs[selectedDrinkForModal.id]?.ratingValue || ''}
                              onChange={(e) => handleRatingInputChange(selectedDrinkForModal.id, 'ratingValue', e.target.value)}
                              className="text-black w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              required
                          >
                              <option value="" disabled>Select rating</option>
                              <option value="5">5 Stars</option>
                              <option value="4">4 Stars</option>
                              <option value="3">3 Stars</option>
                              <option value="2">2 Stars</option>
                              <option value="1">1 Star</option>
                          </select>
                      </div>
                      {/* Review Text Input */} 
                      <div className="mb-3">
                          <label htmlFor={`review-${selectedDrinkForModal.id}`} className="block text-sm font-medium text-gray-700 mb-1">Review (optional):</label>
                          <textarea
                              id={`review-${selectedDrinkForModal.id}`}
                              rows={3}
                              value={ratingInputs[selectedDrinkForModal.id]?.reviewText || ''}
                              onChange={(e) => handleRatingInputChange(selectedDrinkForModal.id, 'reviewText', e.target.value)}
                              className="text-black w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Share your thoughts..."
                          />
                      </div>
                      {/* Submission Error Display */} 
                      {ratingError && <p className="text-red-500 text-sm mb-2">{ratingError}</p>}
                      <button
                          type="submit"
                          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          disabled={allRatings[selectedDrinkForModal.id]?.isLoading} // Disable while submitting/refetching
                      >
                         {allRatings[selectedDrinkForModal.id]?.isLoading ? 'Submitting...' : 'Submit Rating'}
                      </button>
                  </form>
              )}
              {sessionStatus !== 'authenticated' && (
                  <p className="text-center text-gray-600 mb-4">Please log in to rate this drink.</p>
              )}

              {/* Display Existing Ratings */} 
              <h3 className="text-xl font-semibold mb-3 text-gray-700">Reviews</h3>
              {allRatings[selectedDrinkForModal.id]?.isLoading && <p className="text-center">Loading reviews...</p>}
              {allRatings[selectedDrinkForModal.id]?.error && <p className="text-sm text-red-500 mt-2">Error loading reviews: {allRatings[selectedDrinkForModal.id]?.error}</p>}
              
              {allRatings[selectedDrinkForModal.id] && !allRatings[selectedDrinkForModal.id].isLoading && allRatings[selectedDrinkForModal.id].ratings.length > 0 && (
                  <div className="mt-4">
                      <ul className="space-y-4">
                          {allRatings[selectedDrinkForModal.id].ratings.map((rating) => (
                              <li key={rating.id} className="p-3 border-b border-gray-200">
                                  <div className="flex items-center mb-1">
                                      {rating.user.image && (
                                          <Image // Use next/image Image component
                                            src={rating.user.image}
                                            alt={rating.user.name || 'User'}
                                            width={24} // Specify width
                                            height={24} // Specify height
                                            className="w-6 h-6 rounded-full mr-2"
                                           />
                                      )}
                                      <span className="font-semibold text-sm text-gray-800">{rating.user.name || 'Anonymous'}</span>
                                      <span className="ml-auto text-xs text-gray-500">{new Date(rating.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center mb-1">
                                      <span className="text-yellow-500">{'★'.repeat(rating.ratingValue)}</span>
                                      <span className="text-gray-300">{'★'.repeat(5 - rating.ratingValue)}</span>
                                  </div>
                                  {rating.reviewText && <p className="text-sm text-black mt-1">{rating.reviewText}</p>}
                              </li>
                          ))}
                      </ul>
                  </div>
              )}
              {allRatings[selectedDrinkForModal.id] && !allRatings[selectedDrinkForModal.id].isLoading && allRatings[selectedDrinkForModal.id].ratings.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2 italic text-center">Be the first to review this drink!</p>
              )}
          </Modal>
      )}
    </div>
  );
}
