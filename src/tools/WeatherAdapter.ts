import { BaseMCPAdapter } from "./BaseMCPAdapter";
import type { MCPTool } from "./BaseMCPAdapter";
import { Agent } from "agents";
import { z } from "zod";

/**
 * Interface for weather data
 */
export interface WeatherData {
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_dir: string;
    humidity: number;
    feelslike_c: number;
    feelslike_f: number;
    uv: number;
    air_quality?: {
      co: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      "us-epa-index": number;
    };
  };
  forecast?: {
    date: string;
    day: {
      maxtemp_c: number;
      maxtemp_f: number;
      mintemp_c: number;
      mintemp_f: number;
      avgtemp_c: number;
      avgtemp_f: number;
      condition: {
        text: string;
        icon: string;
        code: number;
      };
      daily_chance_of_rain: number;
      daily_chance_of_snow: number;
      uv: number;
    };
    astro: {
      sunrise: string;
      sunset: string;
      moonrise: string;
      moonset: string;
      moon_phase: string;
      moon_illumination: string;
    };
  }[];
}

/**
 * WeatherAdapter provides tools for accessing weather data
 * through the MCP protocol
 */
export class WeatherAdapter<Env> extends BaseMCPAdapter<Env> {
  private serverId: string | null = null;
  
  /**
   * Create a new WeatherAdapter instance
   * @param agent The agent instance to use for MCP connections
   */
  constructor(agent: Agent<Env>) {
    super(agent);
  }
  
  /**
   * Initialize the weather adapter by connecting to a weather service
   * @param weatherServiceUrl URL of the weather service to connect to
   * @returns Connection details
   */
  async initialize(weatherServiceUrl: string): Promise<{ id: string; authUrl?: string }> {
    const connection = await this.connectToService(weatherServiceUrl);
    this.serverId = connection.id;
    return connection;
  }
  
  /**
   * Get all available weather tools
   * @returns Array of weather tools
   */
  getWeatherTools(): MCPTool[] {
    if (!this.serverId) {
      return [];
    }
    
    return this.listTools(this.serverId);
  }
  
  /**
   * Get current weather for a location
   * @param location Location to get weather for (city name, postal code, coordinates)
   * @returns Current weather data
   */
  async getCurrentWeather(location: string): Promise<WeatherData> {
    if (!this.serverId) {
      throw new Error("Weather adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getCurrentWeather", { location });
    return result;
  }
  
  /**
   * Get weather forecast for a location
   * @param location Location to get forecast for
   * @param days Number of days to forecast (1-10)
   * @returns Weather forecast data
   */
  async getForecast(location: string, days: number = 3): Promise<WeatherData> {
    if (!this.serverId) {
      throw new Error("Weather adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getForecast", { 
      location,
      days: Math.min(Math.max(days, 1), 10) // Ensure days is between 1 and 10
    });
    
    return result;
  }
  
  /**
   * Search for locations matching a query
   * @param query Search query
   * @returns Array of matching locations
   */
  async searchLocations(query: string): Promise<Array<{
    name: string;
    country: string;
    region: string;
    lat: number;
    lon: number;
  }>> {
    if (!this.serverId) {
      throw new Error("Weather adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "searchLocations", { query });
    return result;
  }
  
  /**
   * Get air quality data for a location
   * @param location Location to get air quality for
   * @returns Air quality data
   */
  async getAirQuality(location: string): Promise<{
    location: {
      name: string;
      country: string;
    };
    air_quality: {
      co: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      "us-epa-index": number;
      "gb-defra-index": number;
    };
  }> {
    if (!this.serverId) {
      throw new Error("Weather adapter not initialized");
    }
    
    const result = await this.callTool(this.serverId, "getAirQuality", { location });
    return result;
  }
  
  /**
   * Get the schema definitions for weather tools
   * These would be used to define the tools for AI models
   */
  static getToolSchemas() {
    return {
      getCurrentWeather: {
        description: "Get current weather for a location",
        parameters: z.object({
          location: z.string().describe("Location name, postal code, or coordinates (e.g., 'London', '90210', '48.8567,2.3508')")
        })
      },
      
      getForecast: {
        description: "Get weather forecast for a location",
        parameters: z.object({
          location: z.string().describe("Location name, postal code, or coordinates"),
          days: z.number().min(1).max(10).optional().describe("Number of days to forecast (1-10)")
        })
      },
      
      searchLocations: {
        description: "Search for locations matching a query",
        parameters: z.object({
          query: z.string().describe("Search query for locations")
        })
      },
      
      getAirQuality: {
        description: "Get air quality data for a location",
        parameters: z.object({
          location: z.string().describe("Location name, postal code, or coordinates")
        })
      }
    };
  }
}
