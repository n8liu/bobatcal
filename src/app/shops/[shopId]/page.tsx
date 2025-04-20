'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface SimpleShop {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  phone: string | null;
  hours: string | null;
  googlePlaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SimpleDrink {
  id: string;
  name: string;
}

type RatingInputState = {
  [drinkId: string]: {
    ratingValue: number | string;
    reviewText: string;
  }
}

interface FetchedRating {
  id: string;
  ratingValue: number;
  reviewText: string | null;
  createdAt: string;
  user: {
    name: string | null;
    image: string | null;
  };
}

interface DrinkRatingsData {
  averageRating: number;
  ratingCount: number;
  ratings: FetchedRating[];
}

type AllDrinkRatingsState = {
  [drinkId: string]: DrinkRatingsData & { isLoading: boolean; error?: string };
}

export default function ShopDetailPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  const { status: sessionStatus } = useSession();

  const [shop, setShop] = useState<SimpleShop | null>(null);
  const [drinks, setDrinks] = useState<SimpleDrink[]>([]);
  const [newDrinkName, setNewDrinkName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [ratingInputs, setRatingInputs] = useState<RatingInputState>({});
  const [submitRatingError, setSubmitRatingError] = useState<string | null>(null);
  const [allRatings, setAllRatings] = useState<AllDrinkRatingsState>({});

  useEffect(() => {
    if (!shopId) return;

    setIsLoading(true);
    setError(null);

    const fetchShopAndDrinks = async () => {
      try {
        // Fetch shop details first
        const shopRes = await fetch(`/api/shops/${shopId}`);
        if (!shopRes.ok) {
          // Handle shop not found (404) or other errors specifically
          if (shopRes.status === 404) {
            setError(`Shop with ID ${shopId} not found.`);
          } else {
            setError(`Failed to fetch shop details: ${shopRes.status}`);
          }
          setShop(null); // Ensure shop state is null on error
          setIsLoading(false); // Stop loading if shop fetch fails
          return; // Exit early if shop fetch fails
        }
        const shopData: SimpleShop = await shopRes.json();
        setShop(shopData); // Set actual shop data

        // Fetch drinks specifically for this shop
        const drinksRes = await fetch(`/api/shops/${shopId}/drinks`);
        if (!drinksRes.ok) {
          console.error(`Failed to fetch drinks: ${drinksRes.status}`);
          setDrinks([]);
        } else {
          const drinksData: SimpleDrink[] = await drinksRes.json();
          setDrinks(drinksData);
          const initialRatingsInput: RatingInputState = {};
          const initialAllRatingsState: AllDrinkRatingsState = {};
          drinksData.forEach(drink => {
            initialRatingsInput[drink.id] = { ratingValue: '', reviewText: '' };
            initialAllRatingsState[drink.id] = { averageRating: 0, ratingCount: 0, ratings: [], isLoading: true };
          });
          setRatingInputs(initialRatingsInput);
          setAllRatings(initialAllRatingsState);
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('An unknown error occurred during fetch');
        setError(error.message);
        console.error("Fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopAndDrinks();
  }, [shopId]);

  useEffect(() => {
    if (drinks.length === 0) return;

    const fetchRatingsForDrinks = async () => {
      drinks.forEach(async (drink) => {
        setAllRatings(prev => ({ ...prev, [drink.id]: { ...prev[drink.id], isLoading: true, error: undefined } }));
        try {
          const res = await fetch(`/api/drinks/${drink.id}/ratings`);
          if (!res.ok) {
            throw new Error(`Failed to fetch ratings for ${drink.name} (${res.status})`);
          }
          const data: DrinkRatingsData = await res.json();
          setAllRatings(prev => ({ ...prev, [drink.id]: { ...data, isLoading: false } }));
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error fetching ratings';
          console.error(`Error fetching ratings for drink ${drink.id}:`, err);
          setAllRatings(prev => ({ ...prev, [drink.id]: { ...prev[drink.id], isLoading: false, error: errorMsg } }));
        }
      });
    };

    fetchRatingsForDrinks();
  }, [drinks]);

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

      setDrinks(prevDrinks => [...prevDrinks, newlyAddedDrink]);
      setRatingInputs(prev => ({ ...prev, [newlyAddedDrink.id]: { ratingValue: '', reviewText: '' } }));
      setAllRatings(prev => ({ ...prev, [newlyAddedDrink.id]: { averageRating: 0, ratingCount: 0, ratings: [], isLoading: true } }));
      setNewDrinkName('');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An error occurred while adding the drink.');
      setFormError(error.message);
      console.error("Add drink error:", err);
    }
  };

  const handleRatingChange = (drinkId: string, field: 'ratingValue' | 'reviewText', value: string) => {
    setRatingInputs(prev => ({
      ...prev,
      [drinkId]: {
        ...prev[drinkId],
        [field]: value
      }
    }));
  };

  const handleRatingSubmit = async (drinkId: string) => {
    setSubmitRatingError(null);
    const ratingData = ratingInputs[drinkId];
    const ratingValueNum = parseFloat(ratingData.ratingValue as string);

    if (isNaN(ratingValueNum) || ratingValueNum < 1 || ratingValueNum > 5) {
      setSubmitRatingError('Rating must be a number between 1 and 5.');
      return;
    }

    try {
      const response = await fetch(`/api/drinks/${drinkId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ratingValue: ratingValueNum,
          reviewText: ratingData.reviewText || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to submit rating (${response.status})`);
      }

      console.log(`Rating submitted successfully for drink ${drinkId}`);
      alert('Rating submitted successfully!');

      setAllRatings(prev => ({ ...prev, [drinkId]: { ...prev[drinkId], isLoading: true, error: undefined } }));
      try {
        const res = await fetch(`/api/drinks/${drinkId}/ratings`);
        if (!res.ok) {
          throw new Error(`Failed to re-fetch ratings (${res.status})`);
        }
        const data: DrinkRatingsData = await res.json();
        setAllRatings(prev => ({ ...prev, [drinkId]: { ...data, isLoading: false } }));
      } catch (fetchErr) {
        const errorMsg = fetchErr instanceof Error ? fetchErr.message : 'Unknown error re-fetching ratings';
        console.error(`Error re-fetching ratings for drink ${drinkId}:`, fetchErr);
        setAllRatings(prev => ({ ...prev, [drinkId]: { ...prev[drinkId], isLoading: false, error: errorMsg } }));
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('An error occurred while submitting the rating.');
      setSubmitRatingError(error.message);
      console.error("Submit rating error:", error);
    }
  };

  if (isLoading || sessionStatus === 'loading') return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!shop) return <div className="p-4">Shop not found.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{shop.name}</h1>
      <p className="text-gray-600 mb-4">{shop.address}</p>

      <hr className="my-6"/>

      <h2 className="text-2xl font-semibold mb-3">Menu & Ratings</h2>
      {submitRatingError && <p className="text-red-500 text-sm mb-3">Rating Submission Error: {submitRatingError}</p>}
      {drinks.length === 0 ? (
        <p>No drinks added yet.</p>
      ) : (
        <ul className="space-y-6 mb-6">
          {drinks.map((drink) => {
            const drinkRatingData = allRatings[drink.id];
            return (
              <li key={drink.id} className="p-4 border rounded-lg shadow-sm bg-white">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-medium text-gray-800">{drink.name}</span>
                  {drinkRatingData && !drinkRatingData.isLoading && (
                    <span className="text-sm text-gray-600">
                      {drinkRatingData.averageRating > 0 ? (
                        <>
                          <span className="font-semibold text-yellow-600">★ {drinkRatingData.averageRating.toFixed(1)}</span>
                          <span className="ml-1">({drinkRatingData.ratingCount} rating{drinkRatingData.ratingCount !== 1 ? 's' : ''})
                          </span>
                        </>
                      ) : (
                        'No ratings yet'
                      )}
                    </span>
                  )}
                  {drinkRatingData?.isLoading && <span className="text-sm text-gray-500">Loading ratings...</span>}
                </div>

                {sessionStatus === 'authenticated' && ratingInputs[drink.id] && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h4 className="text-md font-semibold mb-2 text-gray-700">Rate this Drink:</h4>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <label htmlFor={`rating-${drink.id}`} className="sr-only">Rating Value</label>
                        <input
                          type="number"
                          id={`rating-${drink.id}`}
                          min="1"
                          max="5"
                          step="0.5"
                          value={ratingInputs[drink.id]?.ratingValue ?? ''}
                          onChange={(e) => handleRatingChange(drink.id, 'ratingValue', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div className="flex-grow">
                        <label htmlFor={`review-${drink.id}`} className="sr-only">Review Text</label>
                        <textarea
                          id={`review-${drink.id}`}
                          rows={2}
                          value={ratingInputs[drink.id]?.reviewText ?? ''}
                          onChange={(e) => handleRatingChange(drink.id, 'reviewText', e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="What did you think? (Optional)"
                        ></textarea>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRatingSubmit(drink.id)}
                      className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Submit Rating
                    </button>
                  </div>
                )}

                {drinkRatingData && !drinkRatingData.isLoading && drinkRatingData.ratings.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-md font-semibold mb-2 text-gray-600">Reviews:</h4>
                    <ul className="space-y-3">
                      {drinkRatingData.ratings.map(rating => (
                        <li key={rating.id} className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {rating.user.image ? (
                              <Image
                                src={rating.user.image}
                                alt={rating.user.name || 'User'}
                                width={32}
                                height={32}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm text-gray-600">
                                {rating.user.name ? rating.user.name.charAt(0).toUpperCase() : '?'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {rating.user.name || 'Anonymous User'}
                              <span className="ml-2 text-yellow-600 font-bold">★ {rating.ratingValue.toFixed(1)}</span>
                            </p>
                            {rating.reviewText && (
                              <p className="text-sm text-gray-800 mt-1">{rating.reviewText}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(rating.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {drinkRatingData && !drinkRatingData.isLoading && drinkRatingData.ratings.length === 0 && sessionStatus === 'authenticated' && (
                  <p className="text-sm text-gray-500 mt-2 italic">Be the first to review this drink!</p>
                )}
                {drinkRatingData?.error && <p className="text-sm text-red-500 mt-2">Error loading reviews: {drinkRatingData.error}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {sessionStatus === 'authenticated' && (
        <form onSubmit={handleAddDrink} className="mt-8 p-4 border rounded-lg shadow bg-gray-50">
          <h3 className="text-xl font-semibold mb-3">Add New Drink to Menu</h3>
          <div className="mb-3">
            <label htmlFor="drinkName" className="block text-sm font-medium text-gray-700 mb-1">
              Drink Name:
            </label>
            <input
              type="text"
              id="drinkName"
              value={newDrinkName}
              onChange={(e) => setNewDrinkName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
    </div>
  );
}
