import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { EventService } from "../../event.service";
import { map, startWith, debounceTime, switchMap } from 'rxjs/operators';
import {Observable, of} from "rxjs";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import { tap } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { NgbCarouselConfig } from '@ng-bootstrap/ng-bootstrap';
import { Carousel } from 'bootstrap';
import { ActivatedRoute } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';



type FavoriteEvent = {
  id: string;
  date: string;
  name: string;
  category: string;
  venue: string;
};

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {



  autoDetect: boolean = false;
  events: any[] = [];
  loc: string = '';
  selectedEvent: any;

  isFavorite: boolean = false;


  venueDetails: any;
  selectedTab: string = 'event-details';

  showMap: boolean = false;
  mapCenter: google.maps.LatLngLiteral = { lat: 0, lng: 0 };

  expandedSections: { [key: string]: boolean } = {
  openHours: false,
  generalRules: false,
  childRules: false,
};

  mapZoom: number = 16;


  artistInfo: any;

  distance: string = '';
  musicRelatedEvent: boolean = false;

  showResults = true;

  searchCompleted = false;
  keywordControl = new FormControl();
  filteredKeywords: Observable<string[]> = of([]);

  @ViewChild('searchForm') searchForm!: NgForm;

  private googleMapsApiKey = 'AIzaSyBTUtqzZlsEk7dtUo60SXm7s3ApWrETFUQ';



  constructor(private eventService: EventService, private http: HttpClient, private changeDetector: ChangeDetectorRef, private activatedRoute: ActivatedRoute, private router: Router) {
}

ngOnInit() {

  this.distance = '10';

  this.filteredKeywords = this.keywordControl.valueChanges.pipe(
    startWith(''),
    debounceTime(300),
    switchMap(value => this.fetchKeywords(value))
  );

}



  clearSearch(form: NgForm) {
  form.reset();
  // clear cache
  this.showResults = false;
  this.selectedEvent = null;
  this.artistInfo = [];

}

  selectTab(tabId: string): void {
  this.selectedTab = tabId;
}

onEventRowClick(eventId: string) {
  this.eventService.getEventDetails(eventId).subscribe(
    (details) => {
      this.selectedEvent = details._embedded.events[0];
      this.checkIfFavorite();
      const musicRelated = this.selectedEvent._embedded.attractions.filter((attraction: any) => attraction.classifications && attraction.classifications[0].segment && (attraction.classifications[0].segment.name.toLowerCase() === "music"));

      if (musicRelated.length > 0) {
        const musicRelatedAttractionNames = musicRelated.map((attraction: any) => attraction.name);
        console.log('music related', musicRelatedAttractionNames);
        this.fetchArtistDetails(musicRelatedAttractionNames);
        console.log('artists info', this.artistInfo);
      } else {
        this.musicRelatedEvent = false;
      }
       this.fetchVenueDetails(this.selectedEvent._embedded.venues[0].name);

      console.log('venues details', this.venueDetails);
      console.log('Event details:', this.selectedEvent);
    },
    (error) => {
      console.error('Error fetching event details:', error);
    }
  );
}


    onBackButtonClick() {
        this.selectedEvent = null;
        localStorage.removeItem('lastSelectedEvent');
      }
  AutoDetectChange(): void {
    this.fetchLoc();
  }

  onKeywordSelected(event: MatAutocompleteSelectedEvent): void {
    const selectedKeyword = event.option.value;
    console.log('Selected keyword:', selectedKeyword);
    this.keywordControl.setValue(selectedKeyword);
  }


  // use ipinfo to get user's location.
  fetchLoc(): void {
    if (this.autoDetect) {
      this.http.get('https://ipinfo.io?token=8d4ef3a1c46e73').subscribe((response: any) => {
        this.loc = `${response.city}, ${response.region}, ${response.country}`;
        console.log(this.loc)
        this.clearLocationInput();
      });
    } else {
      this.loc = '';
      this.clearLocationInput();
    }
  }

  clearLocationInput(): void {
  const locationInput = document.getElementById('location') as HTMLInputElement;
  locationInput.value = '';
}

  displayKeyword(keyword: string): string{
    return keyword ? keyword : '';
  }

  // get the latitude and longitude of the location
  getGeo(location: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const locEncode = encodeURIComponent(location);
      this.http.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${locEncode}&key=${this.googleMapsApiKey}`).subscribe((response: any) => {
        if (response.status === 'OK') {
          const lat = response.results[0].geometry.location.lat;
          const lng = response.results[0].geometry.location.lng;
          console.log(`Latitude: ${lat}, Longitude: ${lng}`);
          resolve({ lat, lng });
        } else {
          console.log('Error in Geocoding API:', response.status);
          reject(response.status);
        }
      });
    });
  }

  async submitSearch(formData: any): Promise<void> {
    const { keyword, distance, category, location } = formData;
    let latLng;
    this.searchCompleted = true;
    this.events = [];
    if (this.autoDetect) {
      latLng = await this.getGeo(this.loc);
    } else {
      latLng = await this.getGeo(location);
    }
    this.showResults = true;
    this.eventService.searchEvents(keyword, distance, category, latLng.lat, latLng.lng).subscribe(
        (response) => {
          if (response._embedded) {
            this.events = response._embedded.events;
             this.events.sort((a, b) => a.dates.start.dateTime.localeCompare(b.dates.start.dateTime)
      );
          } else {
            this.events = [];
          }
        },
        (error) => {
          console.error('Error fetching search results:', error);
        }
      );
  }



  fetchKeywords(keyword: string): Observable<string[]> {
    if (!keyword || keyword.trim().length === 0) {
      return of([]);
    }

    return this.eventService.getKeywordSuggestions(keyword).pipe(
      map((attractions: string[]) => {
            if (attractions && attractions.length > 0) {
              console.log('attt',attractions);
              this.changeDetector.detectChanges();
              return attractions;
            } else {
              console.log('empty');
              return [];
            }
          })
        );
  }


fetchArtistDetails(attractionNames: string[]): void {
  // Clear artistInfo array
  this.artistInfo = [];

  attractionNames.forEach((attractionName) => {
    this.eventService.searchArtists(attractionName).subscribe(
      (response) => {
        const matchedArtist = response.artists.items.find((artist: any) => artist.name.toLowerCase() === attractionName.toLowerCase());
        if (matchedArtist) {
          this.artistInfo.push(matchedArtist);
          this.musicRelatedEvent = true;

          this.fetchArtistAlbums(matchedArtist.id).subscribe(
            (albums) => {
              matchedArtist.albums = albums;
            },
            (error) => {
              console.error('Error fetching artist albums:', error);
            }
          );
        }
      },
      (error) => {
        console.error('Error fetching artist details:', error);
      }
    );
  });
}


  fetchArtistAlbums(artistId: string): Observable<any> {
    return this.eventService.getArtistAlbums(artistId).pipe(
      map((response) => response.items)
    );
  }


    prevSlide(event: Event) {
      event.preventDefault();
      const carousel = document.getElementById('artistCarousel');
      if (carousel) {
        const carouselInstance = new Carousel(carousel);
        carouselInstance.prev();
      }
    }

    nextSlide(event: Event) {
      event.preventDefault();
      const carousel = document.getElementById('artistCarousel');
      if (carousel) {
        const carouselInstance = new Carousel(carousel);
        carouselInstance.next();
      }
    }


   fetchVenueDetails(venueName: string): void {
    this.eventService.getVenueDetails(venueName).subscribe(
      (details) => {
        this.venueDetails = details._embedded.venues[0];
        console.log('Venue details:', this.venueDetails);
      },
      (error) => {
        console.error('Error fetching venue details:', error);
      }
    );
  }

  resetSelectedTab(): void {
  this.selectedTab = 'event-details';
}

    forceLayoutUpdate() {
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 0);
}

  toggleSection(section: string): void {
  this.expandedSections[section] = !this.expandedSections[section];
   setTimeout(() => {
    const venueContainer = document.querySelector('.venue-container') as HTMLElement;
    venueContainer.style.height = 'auto';
  }, 100);
   this.forceLayoutUpdate();
}



  // Google maps section
  mapOptions: google.maps.MapOptions = {
  mapTypeId: 'roadmap',
  disableDefaultUI: false,
  };
  markerOptions: google.maps.MarkerOptions = {
    draggable: false,
  };

  openMap() {
    this.showMap = true;
    this.mapCenter = {
      lat: parseFloat(this.venueDetails.location.latitude),
      lng: parseFloat(this.venueDetails.location.longitude),
    };
  }


  closeMap() {
    this.showMap = false;
  }

  // favorites
    toggleFavorite() {
    const favorites = this.getFavorites();

    if (this.isFavorite) {
      this.removeFromFavorites(favorites);
      alert('Removed from Favorites!');
    } else {
      this.addToFavorites(favorites);
      alert('Event Added to Favorites!');
    }

    this.isFavorite = !this.isFavorite;
  }

  getFavorites() {
    const stored = localStorage.getItem('favorites');
    if (stored) {
      return JSON.parse(stored);
    } else {
      return [];
    }
  }


  addToFavorites(favorites: FavoriteEvent[]) {
    const favoriteEvent: FavoriteEvent = {
      id: this.selectedEvent.id,
      date: this.selectedEvent.dates.start.localDate,
      name: this.selectedEvent.name,
      category: this.selectedEvent.classifications[0].segment.name,
      venue: this.selectedEvent._embedded.venues[0].name,
    };

    favorites.push(favoriteEvent);
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }

  removeFromFavorites(favorites: FavoriteEvent[]) {
    const updated = favorites.filter((event) => event.id !== this.selectedEvent.id);
    localStorage.setItem('favorites', JSON.stringify(updated));
  }

  checkIfFavorite() {
  const favorites = this.getFavorites();
  this.isFavorite = favorites.some((event: FavoriteEvent) => event.id === this.selectedEvent.id);
}


}
