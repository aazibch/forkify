import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import { elements, renderLoader, clearLoader } from './views/base';


/* Global State
    - Search object
    - Current recipe object
    - Shopping list object
    - Liked recipes
*/

const state = {};

// Search Controller
const controlSearch = async () => {
    // 1) Get query from view
    const query = searchView.getInput();

    if (query) {
        // 2) New search object and edit state
        state.search = new Search(query);

        // 3) Prepare UI for results
        searchView.clearInput();
        searchView.clearResults();
        renderLoader(elements.searchRes);

        try {
            // 4) Search for recipes
            await state.search.getResults();
    
            // 5) Render results to the UI
            clearLoader();
            searchView.renderResults(state.search.result);
        } catch (err) {
            alert('Something went wrong with the search.');
            clearLoader();
        }
    }
}

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    
    if (btn) {
        const goToPage = +btn.dataset.goto;
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
});

// Recipe Controller
const controlRecipe = async () => {
    // Get ID from URL
    const id = window.location.hash.replace('#', '');

    if (id) {
        // Prepare UI for changes
        recipeView.clearRecipe();
        renderLoader(elements.recipe);

        // Highlight selected search item
        if (state.search) searchView.highlightSelected(id);

        // Create a new Recipe object
        state.recipe = new Recipe(id);

        try {
            // Get recipe data
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();
    
            // Calculate servings and preparation time
            state.recipe.calcTime();
            state.recipe.calcServings();
    
            // Render recipe data
            clearLoader();
            recipeView.renderRecipe(
                state.recipe, 
                state.likes.isLiked(id)
            );
        } catch (err) {
            alert('Error getting recipe!');
        }

    }
}

// window.addEventListener('hashchange', controlRecipe);
// window.addEventListener('load', controlRecipe);

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

// List Controller
const controlList = () => {
    // Create a new list if there is none yet
    if (!state.list) state.list = new List();

    // Add each ingredient to the list and UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });
};

// Handle delete and update list item events
elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.id;

    // Handle the delete button
    if (e.target.matches('.shopping__delete, .shopping__delete *')) {
        // Delete from state
        state.list.deleteItem(id);

        //Delete from UI
        listView.deleteItem(id);

    // Handle the ingredient count
    } else if (e.target.matches('.shopping__count-value')) {
        const val = +e.target.value;
        state.list.updateCount(id, val);
    }
});

// Like Controller
const controlLike = () => {
    if (!state.likes) state.likes = new Likes();

    if (!state.likes.isLiked(state.recipe.id)) {
        // Add like to state
        const newLike = state.likes.addLike(
            state.recipe.id,
            state.recipe.title,
            state.recipe.author,
            state.recipe.img
        );

        // Change like button
        likesView.changeLikeButton(true);

        // Add like to the UI
        likesView.renderLike(newLike);
    } else {
        // Remove like from the state
        state.likes.deleteLike(state.recipe.id);

        // Change like button
        likesView.changeLikeButton(false);

        // Remove like from UI
        likesView.removeLike(state.recipe.id);
    }

    likesView.changeLikesMenuVisibility(state.likes.getNumberLikes());
}

// Restore liked recipes on page load
window.addEventListener('load', () => {
    state.likes = new Likes();

    // Restore likes from localStorage
    state.likes.readStorage();

    likesView.changeLikesMenuVisibility(state.likes.getNumberLikes());

    // Render the liked recipes
    state.likes.likes.forEach(like => likesView.renderLike(like));
});

// Handling recipe button clicks
elements.recipe.addEventListener('click', e => {
    if (e.target.matches('.btn-decrease, .btn-decrease *')) {
        // Decrease button is clicked
        if (state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            
            recipeView.updateServingsIngredients(state.recipe);
        }
    } else if (e.target.matches('.btn-increase, .btn-increase *')) {
        // Increase button is clicked
        state.recipe.updateServings('inc');

        recipeView.updateServingsIngredients(state.recipe);
    } else if (e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        // Add ingredients to shopping list
        controlList();
    } else if (e.target.matches('.recipe__love, .recipe__love *')) {
        // Manage like/unlike
        controlLike();
    }
});