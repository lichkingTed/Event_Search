import { Component, OnInit } from '@angular/core';

interface Event {
  id: string;
  date: string;
  name: string;
  category: string;
  venue: string;
}

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit {
  favorites: Event[] = [];

  constructor() { }

  ngOnInit(): void {
    this.getFavorites();
  }

  getFavorites() {
    const storedFavorites = localStorage.getItem('favorites');
    if (storedFavorites) {
      this.favorites = JSON.parse(storedFavorites);
    }
  }

  removeFavorite(eventToRemove: Event) {
    const updatedFavorites = this.favorites.filter(event => event.id !== eventToRemove.id);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    this.favorites = updatedFavorites;
    alert('Removed from Favorites!');
  }
}
