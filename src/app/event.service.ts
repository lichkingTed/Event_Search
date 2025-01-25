import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private backend = 'http://localhost:3000';
  constructor(private http: HttpClient) { }


  getKeywordSuggestions(keyword: string): Observable<string[]> {
    return this.http.get<any>(`${this.backend}/suggest-keywords?keyword=${keyword}`).pipe(
      tap(response => console.log('Raw response:', response)),
      map(response => response._embedded && response._embedded.attractions ? response._embedded.attractions.map((attraction: any) => attraction.name) : [])
    );
  }



    searchEvents(keyword: string, distance: string, category: string, lat: number, lng: number): Observable<any> {
      console.log(lat, lng);
      let params = new HttpParams()
        .set('keyword', keyword)
        .set('distance', distance)
        .set('category', category)
        .set('lat', lat.toString())
        .set('lng', lng.toString());
      return this.http.get<any>(`${this.backend}/search-events`, { params });
    }

    getEventDetails(id: string): Observable<any> {
      let params = new HttpParams().set('id', id);
      return this.http.get<any>(`${this.backend}/event-details`, { params });
    }


    searchArtists(keyword: string): Observable<any> {
    return this.http.get<any>(`${this.backend}/search-artists`, {
      params: { keyword },
    });
  }

    getArtistAlbums(artistId: string): Observable<any> {
    return this.http.get<any>(`${this.backend}/artist-albums?artistId=${artistId}`);
  }

  getVenueDetails(venueName: string): Observable<any> {
    return this.http.get<any>(`${this.backend}/venue-details?venueName=${venueName}`);
  }



}
